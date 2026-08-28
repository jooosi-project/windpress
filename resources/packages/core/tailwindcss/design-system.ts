import { __unstable__loadDesignSystem } from "tailwindcss";
import { loadModule } from "./module";
import { loadStylesheet } from "./stylesheet";
import { preprocess } from "./pre-process";
import safe from "postcss-safe-parser";
import { parse } from "@adobe/css-tools";

import type { DesignSystem } from "@tailwindcss/root/packages/tailwindcss/src/design-system";
import type { VFSContainer } from "./vfs";

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
    // Parse the CSS using @adobe/css-tools to get location information
    const ast = parse(cssContent, {
      silent: true, // Don't throw on parse errors, handle gracefully
      source: "input.css",
    });

    // Collect ranges to remove (in reverse order to avoid offset issues)
    const rangesToRemove: Array<{ start: number; end: number }> = [];

    // Recursively walk through the AST to find @apply rules
    function walkRules(rules: any[]): void {
      if (!rules) return;

      rules.forEach((rule) => {
        // Handle @apply at-rules (proper parsing)
        if (rule.type === "atrule" && rule.name === "apply") {
          if (rule.position) {
            const start = rule.position.start;
            const end = rule.position.end;

            if (start && end) {
              const startIndex = getCharacterIndex(cssContent, start.line - 1, start.column - 1);
              const endIndex = getCharacterIndex(cssContent, end.line - 1, end.column - 1);

              if (startIndex !== -1 && endIndex !== -1) {
                rangesToRemove.push({ start: startIndex, end: endIndex });
              }
            }
          }
        }
        // Handle nested at-rules (like @media, @supports, etc.)
        else if (rule.type === "atrule" && rule.rules) {
          walkRules(rule.rules);
        }
        // Handle CSS rules where @apply got parsed as part of selectors
        else if (rule.type === "rule" && rule.selectors) {
          rule.selectors.forEach((selector: string) => {
            // Check if the selector contains @apply (malformed parsing)
            if (selector.includes("@apply")) {
              if (rule.position) {
                // Find the specific @apply within this rule's position
                const ruleStart = getCharacterIndex(
                  cssContent,
                  rule.position.start.line - 1,
                  rule.position.start.column - 1,
                );
                const ruleEnd = getCharacterIndex(
                  cssContent,
                  rule.position.end.line - 1,
                  rule.position.end.column - 1,
                );

                if (ruleStart !== -1 && ruleEnd !== -1) {
                  const ruleText = cssContent.slice(ruleStart, ruleEnd);

                  // Find all @apply occurrences within this rule
                  const applyRegex = /@apply\s+[^;{}]*[;}]?/g;
                  let match;

                  while ((match = applyRegex.exec(ruleText)) !== null) {
                    const absoluteStart = ruleStart + match.index;
                    const absoluteEnd = ruleStart + match.index + match[0].length;
                    rangesToRemove.push({ start: absoluteStart, end: absoluteEnd });
                  }
                }
              }
            }
          });

          // Also check declarations for @apply in property names
          if (rule.declarations) {
            rule.declarations.forEach((decl: any) => {
              if (
                decl.type === "declaration" &&
                decl.property &&
                decl.property.startsWith("@apply")
              ) {
                if (decl.position) {
                  const start = decl.position.start;
                  const end = decl.position.end;

                  if (start && end) {
                    const startIndex = getCharacterIndex(
                      cssContent,
                      start.line - 1,
                      start.column - 1,
                    );
                    const endIndex = getCharacterIndex(cssContent, end.line - 1, end.column - 1);

                    if (startIndex !== -1 && endIndex !== -1) {
                      rangesToRemove.push({ start: startIndex, end: endIndex });
                    }
                  }
                }
              }
            });
          }
        }
      });
    }

    // Helper function to convert line/column to character index
    function getCharacterIndex(content: string, line: number, column: number): number {
      const lines = content.split("\n");
      if (line >= lines.length) return -1;

      let index = 0;
      for (let i = 0; i < line; i++) {
        index += lines[i].length + 1; // +1 for newline character
      }
      index += column;

      return index < content.length ? index : -1;
    }

    // Walk the AST to collect ranges
    if (ast.stylesheet && ast.stylesheet.rules) {
      walkRules(ast.stylesheet.rules);
    }

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
