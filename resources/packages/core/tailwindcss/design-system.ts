import { __unstable__loadDesignSystem } from "tailwindcss";
import safe from "postcss-safe-parser";

import type { DesignSystem } from "@tailwindcss/root/packages/tailwindcss/src/design-system";
import type { VFSContainer } from "./vfs";

import { loadModule } from "./module";
import { loadStylesheet } from "./stylesheet";
import { preprocess } from "./pre-process";

export type LoadDesignSystemOptions = {
  entrypoint?: string;
  volume?: VFSContainer;
  [key: string]: any;
};

/**
 * Removes @apply directives from CSS content using AST location information for slicing
 * This approach is more tolerant of CSS parsing issues as it doesn't rebuild the CSS
 */
function cleanCssContent(cssContent: string): string {
  try {
    // Use PostCSS's tolerant parser so incomplete editor input can still be cleaned.
    const ast = safe(cssContent, { from: "input.css" });
    const rangesToRemove: Array<{ start: number; end: number }> = [];

    ast.walkAtRules("apply", (rule) => {
      const start = rule.source?.start?.offset;
      const end = rule.source?.end?.offset;

      if (start !== undefined && end !== undefined) {
        rangesToRemove.push({ start, end });
      }
    });

    // Sort ranges by start position in descending order to remove from end to beginning
    rangesToRemove.sort((a, b) => b.start - a.start);

    // Remove ranges by slicing the original CSS content
    let result = cssContent;
    for (const range of rangesToRemove) {
      result = result.slice(0, range.start) + result.slice(range.end);
    }

    return result;
  } catch (error) {
    // // If CSS parsing fails completely, fall back to regex-based cleaning
    // console.warn('CSS parsing failed, falling back to regex cleaning:', error);

    // let content = cssContent;
    // // Fallback regex patterns (same as before but more conservative)
    // content = content.replace(/@apply\s+[^;{}]*;/g, '');
    // content = content.replace(/@apply\s+[^{}]*(?=\s*})/g, '');
    // content = content.replace(/@apply\s+[^;{}]*$/gm, '');
    // content = content.replace(/^\s*@apply\s*$/gm, '');
    // return content;

    console.warn("CSS parsing failed, returning original content:", error);

    return cssContent;
  }
}

export async function loadDesignSystem({
  entrypoint = "/main.css",
  volume = {} as VFSContainer,
  ...opts
}: LoadDesignSystemOptions = {}): Promise<DesignSystem> {
  // Clean all CSS files in the volume by removing @apply directives
  const cleanedVolume = { ...volume };

  let isStrict = false;
  if (opts?.strict === true) {
    isStrict = true;
    delete opts.strict;
  }

  if (!isStrict) {
    Object.keys(cleanedVolume).forEach((key) => {
      if (key.endsWith(".css")) {
        cleanedVolume[key] = cleanCssContent(cleanedVolume[key]);
      }
    });
  }

  opts = {
    entrypoint,
    volume: cleanedVolume,
    ...opts,
    parser: opts.strict ? safe : null,
  };

  opts.volume[opts.entrypoint] = (await preprocess(opts)).css;

  // @ts-expect-error
  return __unstable__loadDesignSystem(opts.volume[opts.entrypoint], {
    ...opts,
    loadModule: async (modulePath, base, resourceHint) =>
      loadModule(modulePath, base, resourceHint, opts.volume),
    loadStylesheet: async (id, base) => loadStylesheet(id, base, opts.volume),
  });
}
