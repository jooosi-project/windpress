import darkPlus from 'shiki/themes/dark-plus.mjs';
import lightPlus from 'shiki/themes/light-plus.mjs';
import type { Workspace } from 'modern-monaco/workspace';

type ModernMonaco = typeof import('modern-monaco/editor-core');

export const MODERN_MONACO_THEMES = {
  dark: 'dark-plus',
  light: 'light-plus',
} as const;

const WINDPRESS_LIGHT_THEME = { ...lightPlus, name: MODERN_MONACO_THEMES.light };
const WINDPRESS_DARK_THEME = { ...darkPlus, name: MODERN_MONACO_THEMES.dark };

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

function initializeModernMonaco(workspace?: Workspace): Promise<ModernMonaco> {
  if (workspace) {
    enableBuiltinLanguageServices();
  }

  return import('modern-monaco')
    .then(({ init }) =>
      init({
        defaultTheme: WINDPRESS_LIGHT_THEME,
        themes: [WINDPRESS_DARK_THEME],
        workspace,
      }),
    )
    .then((monaco) => {
      if (workspace) {
        setupWorkspaceModelLifecycle(monaco, workspace);
      }

      return monaco;
    });
}

export function loadModernMonaco(workspace?: Workspace): Promise<ModernMonaco> {
  if (!workspace) {
    if (!standaloneMonacoPromise) {
      standaloneMonacoPromise = initializeModernMonaco().catch((error: unknown) => {
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

  const promise = initializeModernMonaco(workspace).catch((error: unknown) => {
    workspaceMonacoPromises.delete(workspace);
    throw error;
  });
  workspaceMonacoPromises.set(workspace, promise);

  return promise;
}
