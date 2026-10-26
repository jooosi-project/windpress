import type { Workspace } from 'modern-monaco/workspace';

type ModernMonaco = typeof import('modern-monaco/editor-core');
type ModernMonacoInitOptions = NonNullable<Parameters<typeof import('modern-monaco').init>[0]>;

export interface ModernMonacoLoadOptions {
  useBuiltinLSP?: boolean;
  lsp?: ModernMonacoInitOptions['lsp'];
}

export const MODERN_MONACO_THEMES = {
  dark: 'dark-plus',
  light: 'light-plus',
} as const;

let standaloneMonacoPromise: Promise<ModernMonaco> | null = null;
const workspaceMonacoPromises = new WeakMap<Workspace, Promise<ModernMonaco>>();
const workspaceModelLifecycle = new WeakSet<Workspace>();

function enableBuiltinLanguageServices(): void {
  const currentEnvironment = Reflect.get(globalThis, 'MonacoEnvironment');
  const environment = typeof currentEnvironment === 'object' && currentEnvironment !== null
    ? currentEnvironment as Record<string, unknown>
    : {};

  Reflect.set(globalThis, 'MonacoEnvironment', {
    ...environment,
    useBuiltinLSP: true,
  });
}

function setupWorkspaceModelLifecycle(monaco: ModernMonaco, workspace: Workspace): void {
  if (workspaceModelLifecycle.has(workspace)) {
    return;
  }

  workspaceModelLifecycle.add(workspace);
  workspace.fs.watch('/', { recursive: true }, (kind, path, type) => {
    if (kind === 'remove' && type === 1) {
      monaco.editor.getModel(monaco.Uri.file(path))?.dispose();
    }
  });
}

function initializeModernMonaco(
  workspace?: Workspace,
  options?: ModernMonacoLoadOptions,
): Promise<ModernMonaco> {
  if (workspace || options?.useBuiltinLSP) {
    enableBuiltinLanguageServices();
  }

  return import('modern-monaco')
    .then(({ init }) =>
      init({
        defaultTheme: MODERN_MONACO_THEMES.light,
        themes: [MODERN_MONACO_THEMES.dark],
        workspace,
        lsp: options?.lsp,
      }),
    )
    .then((monaco) => {
      if (workspace) {
        setupWorkspaceModelLifecycle(monaco, workspace);
      }

      return monaco;
    });
}

export function loadModernMonaco(
  workspace?: Workspace,
  options?: ModernMonacoLoadOptions,
): Promise<ModernMonaco> {
  if (!workspace) {
    if (!standaloneMonacoPromise) {
      standaloneMonacoPromise = initializeModernMonaco(undefined, options).catch((error: unknown) => {
        standaloneMonacoPromise = null;
        throw error;
      });
    }

    return standaloneMonacoPromise;
  }

  const existing = workspaceMonacoPromises.get(workspace);

  if (existing) {
    return existing;
  }

  const promise = initializeModernMonaco(workspace, options).catch((error: unknown) => {
    workspaceMonacoPromises.delete(workspace);
    throw error;
  });
  workspaceMonacoPromises.set(workspace, promise);

  return promise;
}
