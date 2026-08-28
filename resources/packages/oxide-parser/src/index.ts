/**
 * WASM-powered Tailwind CSS candidate parser used internally by WindPress.
 */

type OxideParserModule = typeof import('../pkg/oxide_parser.js');

let wasmModule: OxideParserModule | null = null;
let initPromise: Promise<void> | null = null;

export async function init(wasmUrl?: string): Promise<void> {
  if (wasmModule) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async function initializeWasm() {
    try {
      const module = await import('../pkg/oxide_parser.js');

      if (wasmUrl) {
        await module.default({ module_or_path: wasmUrl });
      } else {
        await module.default();
      }
      wasmModule = module;
    } catch (error) {
      initPromise = null;
      throw new Error(
        `Failed to initialize WASM module: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  })();

  return initPromise;
}

export async function getCandidates(input: string | string[]): Promise<string[]> {
  await init();

  return getInitializedModule().getCandidates(input) as string[];
}

export function getCandidatesSync(input: string | string[]): string[] {
  return getInitializedModule().getCandidates(input) as string[];
}

export function isInitialized(): boolean {
  return wasmModule !== null;
}

function getInitializedModule(): OxideParserModule {
  if (!wasmModule) {
    throw new Error(
      'WASM module not initialized. Call init() and await it before using getCandidatesSync(), or use getCandidates() instead.',
    );
  }

  return wasmModule;
}

export type TailwindCandidate = string;
export type ParseResult = TailwindCandidate[];
export type BatchParseResult = ParseResult[];

export { init as default };
