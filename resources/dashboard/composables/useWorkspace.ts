import type * as monacoEditor from 'monaco-editor';
import { useVolumeStore, type Entry } from '@/dashboard/stores/volume';

export type WorkspaceFileType = 1 | 2;

export interface WorkspaceFileStat {
  readonly type: WorkspaceFileType;
  readonly ctime: number;
  readonly mtime: number;
  readonly version: number;
  readonly size: number;
}

export interface WorkspaceWatchContext {
  isModelContentChange?: boolean;
}

export type WorkspaceWatchHandle = (
  kind: 'create' | 'modify' | 'remove',
  filename: string,
  type?: WorkspaceFileType,
  context?: WorkspaceWatchContext,
) => void;

export interface WorkspaceFileSystem {
  copy(source: string, target: string, options?: { overwrite: boolean }): Promise<void>;
  createDirectory(dir: string): Promise<void>;
  delete(filename: string, options?: { recursive: boolean }): Promise<void>;
  readDirectory(filename: string): Promise<[string, WorkspaceFileType][]>;
  readFile(filename: string): Promise<Uint8Array>;
  readTextFile(filename: string): Promise<string>;
  rename(oldName: string, newName: string, options?: { overwrite: boolean }): Promise<void>;
  stat(filename: string): Promise<WorkspaceFileStat>;
  writeFile(
    filename: string,
    content: string | Uint8Array,
    context?: WorkspaceWatchContext,
  ): Promise<void>;
  watch(
    filename: string,
    options: { recursive: boolean },
    handle: WorkspaceWatchHandle,
  ): () => void;
  watch(filename: string, handle: WorkspaceWatchHandle): () => void;
}

export interface WorkspaceHistoryState {
  readonly current: string;
}

export interface WorkspaceHistory {
  readonly state: WorkspaceHistoryState;
  back(): void;
  forward(): void;
  push(path: string): void;
  replace(path: string): void;
  onChange(callback: (state: WorkspaceHistoryState) => void): () => void;
}

export interface WorkspaceViewState {
  get(path: string): Promise<monacoEditor.editor.ICodeEditorViewState | undefined>;
  save(path: string, viewState: monacoEditor.editor.ICodeEditorViewState): Promise<void>;
}

type MonacoEditor = typeof import('monaco-editor');

interface WorkspaceWatcher {
  filename: string;
  recursive: boolean;
  handle: WorkspaceWatchHandle;
}

const MODEL_URI_PREFIX = 'file:///windpress/';

function normalizeWorkspacePath(value: string): string {
  let filename = value.trim();

  if (filename.startsWith('file://')) {
    filename = decodeURIComponent(new URL(filename).pathname);
  }

  filename = filename.replace(/^\/+/, '');

  if (filename.startsWith('windpress/')) {
    filename = filename.slice('windpress/'.length);
  }

  const parts = filename.split('/').filter((part) => part && part !== '.');

  if (parts.some((part) => part === '..')) {
    throw new Error('Workspace paths cannot contain parent-directory segments.');
  }

  return parts.join('/');
}

function modelUriForPath(filename: string): string {
  return `${MODEL_URI_PREFIX}${normalizeWorkspacePath(filename)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`;
}

function isWithinPath(filename: string, parent: string): boolean {
  return filename === parent || filename.startsWith(`${parent}/`);
}

class VolumeFileSystem implements WorkspaceFileSystem {
  private readonly watchers = new Set<WorkspaceWatcher>();

  constructor(private readonly volumeStore: ReturnType<typeof useVolumeStore>) {}

  async copy(source: string, target: string, options: { overwrite: boolean } = { overwrite: false }) {
    const destination = normalizeWorkspacePath(target);
    const targetEntry = this.findEntry(destination);

    if (targetEntry && !options.overwrite) {
      throw new Error(`A file named "${destination}" already exists.`);
    }

    await this.writeFile(destination, await this.readFile(source));
  }

  async createDirectory(dir: string): Promise<void> {
    const normalizedDirectory = normalizeWorkspacePath(dir);

    if (!normalizedDirectory) {
      throw new Error('A directory name is required.');
    }

    const existingEntry = this.findEntry(normalizedDirectory);
    if (existingEntry) {
      if (!existingEntry.directory) {
        throw new Error(`A file named "${normalizedDirectory}" already exists.`);
      }

      return;
    }

    this.volumeStore.addNewDirectory(normalizedDirectory);
    this.notify('create', normalizedDirectory, 2);
  }

  async delete(filename: string, options: { recursive: boolean } = { recursive: false }) {
    const normalizedFilename = normalizeWorkspacePath(filename);
    const entry = this.findEntry(normalizedFilename);

    if (entry) {
      this.assertCanModify(entry);

      if (entry.directory) {
        const children = this.visibleEntries().filter(
          (candidate) => candidate !== entry && isWithinPath(candidate.relative_path, normalizedFilename),
        );

        if (children.length && !options.recursive) {
          throw new Error(`Cannot delete directory without recursive mode: ${normalizedFilename}`);
        }

        children.forEach((candidate) => {
          this.assertCanModify(candidate);
          this.volumeStore.softDeleteEntry(candidate);
          this.notify('remove', candidate.relative_path, candidate.directory ? 2 : 1);
        });
      }

      this.volumeStore.softDeleteEntry(entry);
      this.notify('remove', normalizedFilename, entry.directory ? 2 : 1);
      return;
    }

    const entries = this.visibleEntries().filter((candidate) =>
      isWithinPath(candidate.relative_path, normalizedFilename),
    );

    if (!entries.length) {
      throw new Error(`No such file or directory: ${normalizedFilename}`);
    }

    if (!options.recursive) {
      throw new Error(`Cannot delete directory without recursive mode: ${normalizedFilename}`);
    }

    entries.forEach((candidate) => {
      this.assertCanModify(candidate);
      this.volumeStore.softDeleteEntry(candidate);
      this.notify('remove', candidate.relative_path, candidate.directory ? 2 : 1);
    });
  }

  async readDirectory(filename: string): Promise<[string, WorkspaceFileType][]> {
    const normalizedDirectory = normalizeWorkspacePath(filename);

    if (normalizedDirectory && !(await this.isDirectory(normalizedDirectory))) {
      throw new Error(`Not a directory: ${normalizedDirectory}`);
    }

    const prefix = normalizedDirectory ? `${normalizedDirectory}/` : '';
    const children = new Map<string, WorkspaceFileType>();

    this.visibleEntries().forEach((entry) => {
      if (!entry.relative_path.startsWith(prefix)) {
        return;
      }

      const remainder = entry.relative_path.slice(prefix.length);
      const [child, ...rest] = remainder.split('/');

      if (child) {
        children.set(child, entry.directory || rest.length ? 2 : 1);
      }
    });

    return [...children.entries()].sort(([firstName, firstType], [secondName, secondType]) => {
      if (firstType !== secondType) {
        return firstType === 2 ? -1 : 1;
      }

      return firstName.localeCompare(secondName);
    });
  }

  async readFile(filename: string): Promise<Uint8Array> {
    return new TextEncoder().encode(await this.readTextFile(filename));
  }

  async readTextFile(filename: string): Promise<string> {
    const normalizedFilename = normalizeWorkspacePath(filename);
    const entry = this.findFileEntry(normalizedFilename);

    if (!entry) {
      throw new Error(`No such file: ${normalizedFilename}`);
    }

    return entry.content;
  }

  async rename(
    oldName: string,
    newName: string,
    options: { overwrite: boolean } = { overwrite: false },
  ): Promise<void> {
    const source = normalizeWorkspacePath(oldName);
    const destination = normalizeWorkspacePath(newName);
    const entry = this.findFileEntry(source);

    if (!entry) {
      throw new Error(`No such file: ${source}`);
    }

    if (source === destination) {
      return;
    }

    this.assertCanModify(entry);

    const targetEntry = this.findEntry(destination);
    if (targetEntry && !options.overwrite) {
      throw new Error(`A file named "${destination}" already exists.`);
    }

    if (targetEntry?.directory) {
      throw new Error(`Cannot rename a file over directory: ${destination}`);
    }

    if (targetEntry) {
      this.assertCanModify(targetEntry);
      this.volumeStore.softDeleteEntry(targetEntry);
      this.notify('remove', destination, targetEntry.directory ? 2 : 1);
    }

    this.volumeStore.renameEntry(entry, destination);
    this.notify('remove', source, 1);
    this.notify('create', destination, 1);
  }

  async stat(filename: string): Promise<WorkspaceFileStat> {
    const normalizedFilename = normalizeWorkspacePath(filename);
    const entry = this.findFileEntry(normalizedFilename);

    if (entry) {
      return {
        type: 1,
        ctime: 0,
        mtime: 0,
        version: 1,
        size: new TextEncoder().encode(entry.content).byteLength,
      };
    }

    if (await this.isDirectory(normalizedFilename)) {
      return {
        type: 2,
        ctime: 0,
        mtime: 0,
        version: 1,
        size: 0,
      };
    }

    throw new Error(`No such file or directory: ${normalizedFilename}`);
  }

  async writeFile(
    filename: string,
    content: string | Uint8Array,
    context?: WorkspaceWatchContext,
  ): Promise<void> {
    const normalizedFilename = normalizeWorkspacePath(filename);
    const entry = this.findEntry(normalizedFilename);

    if (entry?.directory) {
      throw new Error(`Cannot write a file over directory: ${normalizedFilename}`);
    }
    const text = typeof content === 'string' ? content : new TextDecoder().decode(content);

    if (entry) {
      this.assertCanModify(entry);
      entry.content = text;
      this.notify('modify', normalizedFilename, 1, context);
      return;
    }

    this.volumeStore.addNewEntry(normalizedFilename);
    const newEntry = this.findEntry(normalizedFilename);

    if (newEntry) {
      newEntry.content = text;
    }

    this.notify('create', normalizedFilename, 1, context);
  }

  watch(filename: string, handle: WorkspaceWatchHandle): () => void;
  watch(filename: string, options: { recursive: boolean }, handle: WorkspaceWatchHandle): () => void;
  watch(
    filename: string,
    optionsOrHandle: { recursive: boolean } | WorkspaceWatchHandle,
    maybeHandle?: WorkspaceWatchHandle,
  ): () => void {
    const watcher: WorkspaceWatcher = {
      filename: normalizeWorkspacePath(filename),
      recursive: typeof optionsOrHandle !== 'function' && optionsOrHandle.recursive,
      handle: typeof optionsOrHandle === 'function' ? optionsOrHandle : maybeHandle as WorkspaceWatchHandle,
    };

    this.watchers.add(watcher);

    return () => {
      this.watchers.delete(watcher);
    };
  }

  private visibleEntries(): Entry[] {
    return this.volumeStore.data.entries.filter((entry) => !entry.hidden);
  }

  private findEntry(filename: string): Entry | undefined {
    return this.visibleEntries().find((entry) => entry.relative_path === filename);
  }

  private findFileEntry(filename: string): Entry | undefined {
    return this.visibleEntries().find(
      (entry) => entry.relative_path === filename && !entry.directory,
    );
  }

  private findDirectoryEntry(filename: string): Entry | undefined {
    return this.visibleEntries().find(
      (entry) => entry.relative_path === filename && entry.directory,
    );
  }

  private async isDirectory(filename: string): Promise<boolean> {
    if (!filename) {
      return true;
    }

    if (this.findDirectoryEntry(filename)) {
      return true;
    }

    const prefix = `${filename}/`;
    return this.visibleEntries().some((entry) => entry.relative_path.startsWith(prefix));
  }

  private assertCanModify(entry: Entry): void {
    if (entry.readonly) {
      throw new Error(`File "${entry.relative_path}" is read-only.`);
    }
  }

  private notify(
    kind: 'create' | 'modify' | 'remove',
    filename: string,
    type: WorkspaceFileType,
    context?: WorkspaceWatchContext,
  ): void {
    this.watchers.forEach((watcher) => {
      const watchedPath = watcher.filename;
      const matches = watcher.recursive
        ? !watchedPath || isWithinPath(filename, watchedPath)
        : filename === watchedPath;

      if (matches) {
        watcher.handle(kind, filename, type, context);
      }
    });
  }
}

class LocalWorkspaceHistory implements WorkspaceHistory {
  private readonly stack: string[] = [];
  private index = -1;
  private readonly listeners = new Set<(state: WorkspaceHistoryState) => void>();

  get state(): WorkspaceHistoryState {
    return { current: this.current };
  }

  back(): void {
    if (this.index <= 0) {
      return;
    }

    this.index -= 1;
    this.emit();
  }

  forward(): void {
    if (this.index >= this.stack.length - 1) {
      return;
    }

    this.index += 1;
    this.emit();
  }

  push(path: string): void {
    if (this.current === path) {
      return;
    }

    this.stack.splice(this.index + 1);
    this.stack.push(path);
    this.index = this.stack.length - 1;
    this.emit();
  }

  replace(path: string): void {
    if (this.index < 0) {
      this.push(path);
      return;
    }

    this.stack[this.index] = path;
    this.emit();
  }

  onChange(callback: (state: WorkspaceHistoryState) => void): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  private get current(): string {
    return this.index >= 0 ? this.stack[this.index] || '' : '';
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

class MemoryWorkspaceViewState implements WorkspaceViewState {
  private readonly states = new Map<string, monacoEditor.editor.ICodeEditorViewState>();

  async get(path: string): Promise<monacoEditor.editor.ICodeEditorViewState | undefined> {
    return this.states.get(normalizeWorkspacePath(path));
  }

  async save(path: string, viewState: monacoEditor.editor.ICodeEditorViewState): Promise<void> {
    this.states.set(normalizeWorkspacePath(path), viewState);
  }
}

export class WindPressWorkspace {
  readonly entryFile = 'main.css';
  readonly fs: WorkspaceFileSystem;
  readonly history: WorkspaceHistory;
  readonly viewState: WorkspaceViewState;

  private monaco: MonacoEditor | null = null;
  private modelLifecycleBound = false;
  private readonly modelBindings = new WeakSet<monacoEditor.editor.ITextModel>();

  constructor(private readonly volumeStore: ReturnType<typeof useVolumeStore>) {
    this.fs = new VolumeFileSystem(volumeStore);
    this.history = new LocalWorkspaceHistory();
    this.viewState = new MemoryWorkspaceViewState();
  }

  modelUri(path: string): string {
    return modelUriForPath(path);
  }

  setMonaco(monaco: MonacoEditor): void {
    this.monaco = monaco;

    if (this.modelLifecycleBound) {
      return;
    }

    this.modelLifecycleBound = true;
    this.fs.watch('', { recursive: true }, (kind, path, type) => {
      if (kind === 'remove' && type === 1) {
        const modelUri = this.monaco?.Uri.parse(this.modelUri(path));
        if (modelUri) {
          this.monaco?.editor.getModel(modelUri)?.dispose();
        }
      }
    });
  }

  async openTextDocument(
    path: string,
    editor?: monacoEditor.editor.IStandaloneCodeEditor,
  ): Promise<monacoEditor.editor.ITextModel | undefined> {
    const normalizedPath = normalizeWorkspacePath(path);
    const content = await this.fs.readTextFile(normalizedPath);

    if (!editor || !this.monaco) {
      this.history.push(normalizedPath);
      return undefined;
    }

    const uri = this.monaco.Uri.parse(this.modelUri(normalizedPath));
    const model =
      this.monaco.editor.getModel(uri) ||
      this.monaco.editor.createModel(content, undefined, uri);

    if (model.getValue() !== content) {
      model.setValue(content);
    }

    this.bindModel(normalizedPath, model);

    const currentModel = editor.getModel();
    if (currentModel && currentModel !== model) {
      const currentUri = currentModel.uri.toString();
      if (currentUri.startsWith(MODEL_URI_PREFIX)) {
        const currentPath = normalizeWorkspacePath(currentUri);
        const currentViewState = editor.saveViewState();
        if (currentPath && currentPath !== normalizedPath && currentViewState) {
          await this.viewState.save(currentPath, currentViewState);
        }
      }
    }

    editor.setModel(model);

    const savedViewState = await this.viewState.get(normalizedPath);
    if (savedViewState) {
      editor.restoreViewState(savedViewState);
    }

    this.history.push(normalizedPath);
    return model;
  }

  async rename(path: string, newPath: string): Promise<void> {
    const oldPath = normalizeWorkspacePath(path);
    const normalizedNewPath = normalizeWorkspacePath(newPath);
    const wasActive = this.volumeStore.activeViewEntryRelativePath === oldPath;

    await this.fs.rename(oldPath, normalizedNewPath);

    if (wasActive) {
      this.volumeStore.activeViewEntryRelativePath = normalizedNewPath;
      this.history.replace(normalizedNewPath);
    }
  }

  async delete(path: string): Promise<void> {
    const normalizedPath = normalizeWorkspacePath(path);
    await this.fs.delete(normalizedPath);

    if (this.volumeStore.activeViewEntryRelativePath === normalizedPath) {
      this.volumeStore.activeViewEntryRelativePath = null;
    }
  }

  private bindModel(path: string, model: monacoEditor.editor.ITextModel): void {
    if (this.modelBindings.has(model)) {
      return;
    }

    this.modelBindings.add(model);
    model.onDidChangeContent(() => {
      const entry = this.volumeStore.data.entries.find(
        (candidate) => candidate.relative_path === path && !candidate.hidden && !candidate.directory,
      );

      if (entry && entry.content !== model.getValue()) {
        entry.content = model.getValue();
      }
    });
  }
}

const workspaceInstances = new WeakMap<object, WindPressWorkspace>();

export function useWorkspace(): WindPressWorkspace {
  const volumeStore = useVolumeStore();
  const existingWorkspace = workspaceInstances.get(volumeStore);

  if (existingWorkspace) {
    return existingWorkspace;
  }

  const workspace = new WindPressWorkspace(volumeStore);
  workspaceInstances.set(volumeStore, workspace);

  return workspace;
}

export { normalizeWorkspacePath };
