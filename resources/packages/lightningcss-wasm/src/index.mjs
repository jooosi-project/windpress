// WindPress's reduced browser wrapper, adapted from Lightning CSS v1.33.0.
import { Environment, napi } from 'napi-wasm';

let wasm;
let initPromise;

export default async function init(input) {
  if (wasm) {
    return;
  }

  if (initPromise) {
    await initPromise;
    return;
  }

  input = input ?? new URL('../pkg/lightningcss_node.wasm', import.meta.url);
  if (
    typeof input === 'string' ||
    (typeof Request === 'function' && input instanceof Request) ||
    (typeof URL === 'function' && input instanceof URL)
  ) {
    input = fetchOrReadFromFs(input);
  }

  let environment;
  initPromise = input
    .then((module) =>
      load(module, {
        env: {
          ...napi,
          __getrandom_v03_custom: (pointer, length) => {
            const bytes = environment.memory.subarray(pointer, pointer + length);
            globalThis.crypto.getRandomValues(bytes);
          },
        },
      }),
    )
    .then(({ instance }) => {
      instance.exports.register_module();
      environment = new Environment(instance);
      wasm = environment.exports;
    });

  await initPromise;
}

export function transform(options) {
  return wasm.transform(options);
}

export { browserslistToTargets } from './browserslistToTargets.js';
export { Features } from './flags.js';

async function load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (error) {
        if (module.headers.get('Content-Type') !== 'application/wasm') {
          console.warn(
            'WebAssembly.instantiateStreaming failed because the server does not serve WASM with application/wasm. Falling back to WebAssembly.instantiate.',
            error,
          );
        } else {
          throw error;
        }
      }
    }

    return WebAssembly.instantiate(await module.arrayBuffer(), imports);
  }

  const instance = await WebAssembly.instantiate(module, imports);
  return instance instanceof WebAssembly.Instance ? { instance, module } : instance;
}

async function fetchOrReadFromFs(input) {
  try {
    const fs = await import('fs');
    return fs.readFileSync(input);
  } catch {
    return fetch(input);
  }
}
