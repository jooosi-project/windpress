import { compile as _compile } from "tailwindcss";
import { loadModule } from "./module";
import lightningcssWasmFile from "~/node_modules/lightningcss-wasm/lightningcss_node.wasm?url";
import init, { Features, transform } from "lightningcss-wasm";
import { loadStylesheet } from "./stylesheet";
import { preprocess } from "./pre-process";
import MagicString from "magic-string";
import remapping from "@jridgewell/remapping";
import { toSourceMap } from "@tailwindcss/root/packages/@tailwindcss-node/src/source-maps";

import type { LoadDesignSystemOptions } from "./design-system";
import type { DecodedSourceMap } from "tailwindcss";

export type BuildOptions = LoadDesignSystemOptions & {
  candidates?: string[];
};

export async function compile({
  candidates = [],
  entrypoint = "/main.css",
  volume = {},
  ...opts
}: BuildOptions) {
  opts = { candidates, entrypoint, volume, ...opts };

  opts.volume[opts.entrypoint] = (await preprocess(opts)).css;

  return await _compile(opts.volume[opts.entrypoint], {
    loadModule: async (modulePath, base, resourceHint) =>
      loadModule(modulePath, base, resourceHint, opts.volume),
    loadStylesheet: async (id, base) => loadStylesheet(id, base, opts.volume),
    from: opts.entrypoint,
  });
}

/**
 * Build the CSS
 */
export async function build({
  candidates = [],
  entrypoint = "/main.css",
  volume = {},
  ...opts
}: BuildOptions): Promise<string> {
  const compiled = await compile({ candidates, entrypoint, volume, ...opts });
  return compiled.build(candidates);
}

export type OptimizeOptions = {
  /**
   * The file being transformed
   */
  file?: string;

  /**
   * Enabled minified output
   */
  minify?: boolean;

  /**
   * The output source map before optimization
   *
   * If omitted a resulting source map will not be available
   */
  map?: string | DecodedSourceMap;
};

export interface TransformResult {
  code: string;
  map: string | undefined;
}

/**
 * Optimize the CSS
 *
 * @link https://github.com/tailwindlabs/tailwindcss/blob/main/packages/%40tailwindcss-node/src/optimize.ts#L29
 */
export async function optimize(
  input: string,
  { file = "main.css", minify = false, map }: OptimizeOptions = {},
): Promise<TransformResult> {
  await init(lightningcssWasmFile);

  if (map !== undefined) {
    try {
      map = typeof map === "string" ? map : toSourceMap(map).raw;
    } catch (err) {
      // If the source map is invalid, we just ignore it and continue without a source map.
      map = undefined;
    }
  }

  function optimize(code: string | Buffer | Uint8Array, map: string | undefined) {
    return transform({
      filename: file,
      code: typeof code === "string" ? new TextEncoder().encode(code) : code,
      minify,
      sourceMap: typeof map !== "undefined",
      inputSourceMap: map,
      drafts: {
        customMedia: true,
      },
      nonStandard: {
        deepSelectorCombinator: true,
      },
      include: Features.Nesting | Features.MediaQueries,
      exclude: Features.LogicalProperties | Features.DirSelector | Features.LightDark,
      targets: {
        safari: (16 << 16) | (4 << 8),
        ios_saf: (16 << 16) | (4 << 8),
        firefox: 128 << 16,
        chrome: 111 << 16,
      },
      errorRecovery: true,
    });
  }

  // Running Lightning CSS twice to ensure that adjacent rules are merged after
  // nesting is applied. This creates a more optimized output.
  let result = optimize(input, map);
  // map = result.map?.toString();
  map = result.map ? new TextDecoder().decode(result.map) : undefined;

  result.warnings = result.warnings.filter((warning) => {
    // Ignore warnings about unknown pseudo-classes as they are likely caused
    // by the use of `:deep()`, `:slotted()`, and `:global()` which are not
    // standard CSS but are commonly used in frameworks like Vue.
    if (/'(deep|slotted|global)' is not recognized as a valid pseudo-/.test(warning.message)) {
      return false;
    }

    return true;
  });

  // Because of `errorRecovery: true`, there could be warnings, so let's let the
  // user know about them.
  if (result.warnings.length > 0) {
    const lines = input.split("\n");

    const output = [
      `Found ${result.warnings.length} ${result.warnings.length === 1 ? "warning" : "warnings"} while optimizing generated CSS:`,
    ];

    for (const [idx, warning] of result.warnings.entries()) {
      output.push("");
      if (result.warnings.length > 1) {
        output.push(`Issue #${idx + 1}:`);
      }

      const context = 2;

      const start = Math.max(0, warning.loc.line - context - 1);
      const end = Math.min(lines.length, warning.loc.line + context);

      const snippet = lines.slice(start, end).map((line, idx) => {
        if (start + idx + 1 === warning.loc.line) {
          return `${dim(`\u2502`)} ${line}`;
        } else {
          return dim(`\u2502 ${line}`);
        }
      });

      snippet.splice(
        warning.loc.line - start,
        0,
        `${dim("\u2506")}${" ".repeat(warning.loc.column - 1)} ${yellow(`${dim("^--")} ${warning.message}`)}`,
        `${dim("\u2506")}`,
      );

      output.push(...snippet);
    }
    output.push("");

    console.warn(output.join("\n"));
  }

  result = optimize(result.code, map);
  // map = result.map?.toString();
  map = result.map ? new TextDecoder().decode(result.map) : undefined;

  let code = new TextDecoder().decode(result.code);

  // Work around an issue where the media query range syntax transpilation
  // generates code that is invalid with `@media` queries level 3.
  const magic = new MagicString(code);
  magic.replaceAll("@media not (", "@media not all and (");

  // We have to use a source-map-preserving method of replacing the content
  // which requires the use of Magic String + remapping(…) to make sure
  // the resulting map is correct
  if (map !== undefined && magic.hasChanged()) {
    const magicMap = magic.generateMap({ source: "original", hires: "boundary" }).toString();
    const remapped = remapping([magicMap, map], () => null);

    map = remapped.toString();
  }

  code = magic.toString();

  return {
    code,
    map,
  };
}

function dim(str: string) {
  return `\x1B[2m${str}\x1B[22m`;
}

function yellow(str: string) {
  return `\x1B[33m${str}\x1B[39m`;
}
