<script setup lang="ts">
import { __ } from "@wordpress/i18n";
import { type Entry, useVolumeStore } from "@/dashboard/stores/volume";
import { useSettingsStore } from "@/dashboard/stores/settings";
import { useColorMode } from "@vueuse/core";
import path from "path";
import { shallowRef, ref, onBeforeUnmount, nextTick, watch } from "vue";
import {
  getVariableList,
  loadDesignSystem,
  naturalExpand,
  getClassList,
  candidatesToCss,
} from "@/packages/core/tailwindcss";
import type * as monacoEditor from "monaco-editor";
import { cssDefaults as monacoCssDefaults } from "monaco-editor/languages/features/css/register";
import Color from "colorjs.io";
import { debounce, throttle } from "lodash-es";
import { useThemeJsonStore } from "@/dashboard/stores/themeJson";
import { twToWp } from "@/dashboard/composables/useThemeJson";
import { useWorkspace } from "@/dashboard/composables/useWorkspace";

type MonacoEditor = typeof monacoEditor;

const volumeStore = useVolumeStore();
const settingsStore = useSettingsStore();
const colorMode = useColorMode();
const themeJsonStore = useThemeJsonStore();
const workspace = useWorkspace();

const props = defineProps<{
  entry: Entry;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
  delete: [entry: Entry];
  reset: [entry: Entry];
}>();

const MONACO_EDITOR_OPTIONS = {
  automaticLayout: true,
  formatOnType: false,
  formatOnPaste: false,
  fontSize: 14,
};

const editorElementRef = shallowRef();
const monacoInstanceRef = shallowRef<MonacoEditor | null>(null);
const isEditorMounted = ref(false);
const monacoDisposables = ref<monacoEditor.IDisposable[]>([]);
let providerRegistrationTimer: ReturnType<typeof setTimeout> | null = null;

// Shared style element for color decorations to reduce DOM manipulation
let colorStyleElement: HTMLStyleElement | null = null;
const colorDecorationClasses = new Set<string>();

// Error state for CSS validation
const cssErrors = ref<{
  hasErrors: boolean;
  errors: Array<{ message: string; line?: number; column?: number; file?: string }>;
}>({
  hasErrors: false,
  errors: [],
});

// Error panel expanded state
const errorPanelExpanded = ref(false);

async function handleEditorMount(
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  monaco: MonacoEditor,
) {
  editorElementRef.value = editor;
  monacoInstanceRef.value = monaco;
  isEditorMounted.value = true;
  workspace.setMonaco(monaco);

  const initialModel = editor.getModel();
  await workspace.openTextDocument(props.entry.relative_path, editor);

  if (
    initialModel &&
    initialModel !== editor.getModel() &&
    !initialModel.uri.path.startsWith('/windpress/')
  ) {
    initialModel.dispose();
  }

  if (Number(settingsStore.virtualOptions("general.tailwindcss.version", 4).value) === 4) {
    let designSystemCache: {
      designSystem: any;
      variablesList: any[];
      classList: any[];
    } | null = null;

    // Enhanced caching with LRU-like behavior and memory management
    let designSystemPromise: Promise<any> | null = null;
    let lastCacheUpdate = 0;
    const CACHE_INVALIDATION_TIME = 30000; // 30 seconds

    const getDesignSystemData = async () => {
      const now = Date.now();

      // If cached and not expired, return immediately
      if (designSystemCache && now - lastCacheUpdate < CACHE_INVALIDATION_TIME) {
        return designSystemCache;
      }

      // If cache exists but expired, return stale data while refreshing
      if (designSystemCache && now - lastCacheUpdate >= CACHE_INVALIDATION_TIME) {
        // Return stale cache immediately, refresh in background
        if (!designSystemPromise) {
          designSystemPromise = refreshDesignSystemCache();
        }
        return designSystemCache;
      }

      // If already loading, return the existing promise
      if (designSystemPromise) {
        return designSystemPromise;
      }

      // Start loading and cache the promise
      designSystemPromise = refreshDesignSystemCache();
      return designSystemPromise;
    };

    const refreshDesignSystemCache = async () => {
      try {
        const volume = volumeStore.getKVEntries();
        const designSystem = await loadDesignSystem({ volume });
        const variablesList = await getVariableList(designSystem);
        const classList = getClassList(designSystem);

        designSystemCache = { designSystem, variablesList, classList };

        const themeJson = twToWp(variablesList);
        themeJsonStore.themeJson = themeJson;

        lastCacheUpdate = Date.now();
      } catch (error) {
        console.warn("Failed to load design system:", error);
        if (!designSystemCache) {
          designSystemCache = {
            designSystem: null,
            variablesList: [],
            classList: [],
          };
        }
      } finally {
        designSystemPromise = null;
      }
      return designSystemCache;
    };

    // Fast debounced health check for immediate user feedback
    const performHealthCheck = debounce(async () => {
      try {
        const volume = volumeStore.getKVEntries();

        // Try loading with strict validation to catch errors
        await loadDesignSystem({ volume, strict: true });

        // If we get here, no errors
        cssErrors.value = {
          hasErrors: false,
          errors: [],
        };
      } catch (error: any) {
        // Parse the error to extract useful information
        const errorInfo = {
          message: error.message || "Unknown CSS error",
          line: error.line,
          column: error.column,
          file: error.input?.from || "main.css",
        };

        cssErrors.value = {
          hasErrors: true,
          errors: [errorInfo],
        };
      }
    }, 750); // Quick validation feedback - 750ms after user stops typing

    // LRU-like cache with size limit
    const autocompleteCache = new Map<string, { items: any[]; timestamp: number; hits: number }>();
    const CACHE_DURATION = 10000; // 10 seconds
    const MAX_CACHE_SIZE = 50;

    const manageCacheSize = () => {
      if (autocompleteCache.size > MAX_CACHE_SIZE) {
        // Remove least recently used entries
        const entries = Array.from(autocompleteCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, Math.floor(MAX_CACHE_SIZE * 0.7)); // Keep 70%

        autocompleteCache.clear();
        entries.forEach(([key, value]) => autocompleteCache.set(key, value));
      }
    };

    const getCachedAutocompleteItems = (
      cacheKey: string,
      generator: () => Promise<any[]>,
    ): Promise<any[]> => {
      return new Promise((resolve) => {
        const cached = autocompleteCache.get(cacheKey);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_DURATION) {
          cached.hits++;
          resolve(cached.items);
          return;
        }

        if (cached && now - cached.timestamp < CACHE_DURATION * 2) {
          // Stale-while-revalidate pattern
          cached.hits++;
          resolve(cached.items);

          generator()
            .then((items) => {
              autocompleteCache.set(cacheKey, { items, timestamp: now, hits: cached.hits });
              manageCacheSize();
            })
            .catch(() => {});
          return;
        }

        generator()
          .then((items) => {
            autocompleteCache.set(cacheKey, { items, timestamp: now, hits: 1 });
            manageCacheSize();
            resolve(items);
          })
          .catch((error) => {
            console.warn("Failed to generate autocomplete items:", error);
            resolve([]);
          });
      });
    };

    // More conservative cache clearing
    const clearDesignSystemCache = debounce(() => {
      lastCacheUpdate = 0; // Mark cache as expired instead of clearing
      autocompleteCache.clear();
      performHealthCheck();
    }, 1000); // Wait 1s after user stops typing

    // Throttle content change handling
    const handleContentChange = throttle(
      () => {
        clearDesignSystemCache();
      },
      500,
      { leading: true, trailing: true },
    );

    monacoDisposables.value.push(editor.onDidChangeModelContent(handleContentChange));

    // Lazy registration of providers
    const registerProviders = () => {
      const completionProvider = monaco.languages.registerCompletionItemProvider("css", {
        async provideCompletionItems(model, position) {
          try {
            const wordInfo = model.getWordUntilPosition(position);

            // Use Tailwind IntelliSense approach for @apply detection
            // Look back up to 30 lines for @apply context (supports multiline)
            const searchStartLine = Math.max(position.lineNumber - 30, 1);
            const searchText = model.getValueInRange({
              startLineNumber: searchStartLine,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            // Use regex pattern from tailwindlabs/tailwindcss-intellisense
            const applyMatches = [...searchText.matchAll(/@apply\s+(?<classList>[^;}]*)$/gi)];
            const lastApplyMatch = applyMatches[applyMatches.length - 1];

            if (lastApplyMatch && lastApplyMatch.groups) {
              const currentClassList = lastApplyMatch.groups.classList || "";
              const words = currentClassList.split(/\s+/);
              const currentWord = words[words.length - 1] || "";
              const cacheKey = `apply_${currentWord}_${currentClassList.length}`;

              try {
                const suggestions = await getCachedAutocompleteItems(cacheKey, async () => {
                  const { classList, variablesList } = await getDesignSystemData();

                  if (!classList || classList.length === 0) {
                    return [];
                  }

                  const getColor = (declarations: any[] | undefined) => {
                    const color = declarations?.find(
                      (declaration) =>
                        declaration.property && declaration.property.includes("color"),
                    );
                    return color?.value || null;
                  };

                  const utilityClasses = classList.filter((classEntity: any) => {
                    if (classEntity.kind !== "utility") return false;
                    if (classEntity.selector.includes(":")) return false;
                    return true;
                  });

                  return utilityClasses.map((classEntity: any, index: number) => {
                    const color = getColor(classEntity.declarations);
                    let kind = monaco.languages.CompletionItemKind.Property;
                    if (color) {
                      kind = monaco.languages.CompletionItemKind.Color;
                    }

                    const suggestion: any = {
                      label: classEntity.selector,
                      kind,
                      insertText: classEntity.selector,
                      range: {
                        startLineNumber: position.lineNumber,
                        startColumn: Math.max(1, position.column - currentWord.length),
                        endLineNumber: position.lineNumber,
                        endColumn: position.column,
                      },
                      sortText: naturalExpand(index),
                      documentation: color ? `Color: ${color}` : classEntity.css || undefined,
                      detail: classEntity.css || undefined,
                    };

                    if (color) {
                      try {
                        let actualColorValue = color;

                        // If color is a CSS variable (var(--color-name)), resolve it
                        const cssVarMatch = color.match(/var\((--[^)]+)\)/);
                        if (cssVarMatch) {
                          const varName = cssVarMatch[1];
                          const variable = variablesList.find((v: any) => v.key === varName);
                          if (variable && variable.value) {
                            actualColorValue = variable.value;
                          } else {
                            return suggestion;
                          }
                        }

                        const colorObj = new Color(actualColorValue);

                        let monacoDetectableColor;
                        if (colorObj.alpha < 1) {
                          const srgb = colorObj.to("srgb");
                          const [red, green, blue] = srgb.coords;
                          const r = Math.round((red ?? 0) * 255);
                          const g = Math.round((green ?? 0) * 255);
                          const b = Math.round((blue ?? 0) * 255);
                          const a = srgb.alpha ?? 1;
                          monacoDetectableColor = `rgba(${r}, ${g}, ${b}, ${a})`;
                        } else {
                          monacoDetectableColor = colorObj.toString({ format: "hex" });
                        }

                        suggestion.documentation = `${monacoDetectableColor}\n\n${classEntity.css || ""}`;
                      } catch (e) {}
                    }

                    return suggestion;
                  });
                });

                return {
                  suggestions,
                };
              } catch (error) {
                console.warn("Error fetching @apply autocomplete suggestions:", error);
                return { suggestions: [] };
              }
            } else {
              try {
                const { variablesList } = await getDesignSystemData();

                if (!variablesList || variablesList.length === 0) {
                  return { suggestions: [] };
                }

                const mappedVariables = variablesList.map((entry: any, index: number) => {
                  const isColor = entry.key.includes("--color");
                  return {
                    kind: isColor
                      ? monaco.languages.CompletionItemKind.Color
                      : monaco.languages.CompletionItemKind.Variable,
                    label: entry.key,
                    insertText: entry.key,
                    detail: entry.value,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: wordInfo.startColumn,
                      endLineNumber: position.lineNumber,
                      endColumn: wordInfo.endColumn,
                    },
                    sortText: naturalExpand(index),
                  };
                });

                return {
                  suggestions: mappedVariables,
                };
              } catch (error) {
                console.warn("Error fetching CSS variable suggestions:", error);
                return { suggestions: [] };
              }
            }
          } catch (error) {
            console.warn("Error in completion provider:", error);
            return { suggestions: [] };
          }
        },
      });
      monacoDisposables.value.push(completionProvider);

      const hoverProvider = monaco.languages.registerHoverProvider("css", {
        async provideHover(model, position) {
          const currentLine = model.getLineContent(position.lineNumber);

          const importThemeMatches = [
            ...currentLine.matchAll(/@import\s+[^;]*\btheme\s*\(\s*([-\w]+)\s*\)/g),
          ];
          for (const importThemeMatch of importThemeMatches) {
            if (importThemeMatch.index === undefined) {
              continue;
            }

            const fullMatch = importThemeMatch[0];
            const themePart = /\btheme\s*\(\s*([-\w]+)\s*\)/.exec(fullMatch);
            if (!themePart || themePart.index === undefined) {
              continue;
            }

            const mode = themePart[1];
            const modeIndex = themePart[0].indexOf(mode);
            if (modeIndex === -1) {
              continue;
            }

            const modeStart = importThemeMatch.index + themePart.index + modeIndex;
            const modeEnd = modeStart + mode.length;
            const isHoveringMode =
              position.column >= modeStart + 1 && position.column <= modeEnd + 1;

            if (!isHoveringMode || mode !== "static") {
              continue;
            }

            return {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: modeStart + 1,
                endLineNumber: position.lineNumber,
                endColumn: modeEnd + 1,
              },
              contents: [
                {
                  value: `\`static\`\n\n${__("Always emit imported theme values into the CSS file instead of only when used.", "windpress")}`,
                },
              ],
            };
          }

          // Get cached design system
          const { designSystem } = await getDesignSystemData();
          if (!designSystem) {
            return null;
          }

          const searchStartLine = Math.max(position.lineNumber - 30, 1);
          const searchEndLine = Math.min(position.lineNumber + 30, model.getLineCount());
          const searchText = model.getValueInRange({
            startLineNumber: searchStartLine,
            startColumn: 1,
            endLineNumber: searchEndLine,
            endColumn: model.getLineMaxColumn(searchEndLine),
          });

          const allApplyMatches = [
            ...searchText.matchAll(/@apply\s+([\s\S]*?)(?=\s*[;}]|@apply|\s*$)/g),
          ];

          if (allApplyMatches.length === 0) {
            return null;
          }

          let relevantMatch = null;
          const linesBeforePosition = position.lineNumber - searchStartLine;

          for (const match of allApplyMatches) {
            const matchIndex = match.index!;
            const textBeforeMatch = searchText.substring(0, matchIndex);
            const linesBeforeMatch = textBeforeMatch.split("\n").length - 1;

            const fullMatchText = match[0];
            const matchLines = fullMatchText.split("\n").length;
            const matchEndLine = linesBeforeMatch + matchLines - 1;

            if (linesBeforePosition >= linesBeforeMatch && linesBeforePosition <= matchEndLine) {
              relevantMatch = match;
              break;
            }
          }

          if (!relevantMatch || !relevantMatch[1]) {
            return null;
          }

          const classList = relevantMatch[1];
          const classNames = classList.split(/\s+/).filter(Boolean);

          if (classNames.length === 0) {
            return null;
          }

          // Find which specific class the cursor is hovering over
          // Check if @apply is on current line (single-line case)
          // For multiple @apply on same line, find the one that contains cursor
          const allSingleLineMatches = [...currentLine.matchAll(/@apply\s+([^;}@]+)/g)];
          let singleLineMatch = null;
          let applyStartIndex = -1;

          for (const match of allSingleLineMatches) {
            const matchStart = match.index!;
            const matchEnd = matchStart + match[0].length;

            // Check if cursor is within this @apply statement
            if (position.column >= matchStart + 1 && position.column <= matchEnd + 1) {
              singleLineMatch = match;
              applyStartIndex = matchStart;
              break;
            }
          }

          if (applyStartIndex !== -1 && singleLineMatch) {
            // Single-line @apply case
            const classList = singleLineMatch[1];
            const classNames = classList.split(/\s+/).filter(Boolean);
            const classListStartInLine = applyStartIndex + "@apply".length;
            let currentIndex = classListStartInLine;
            let hoveredClass = null;
            let hoveredClassRange = null;

            for (const className of classNames) {
              // Skip whitespace
              while (currentIndex < currentLine.length && /\s/.test(currentLine[currentIndex])) {
                currentIndex++;
              }

              const classStart = currentIndex;
              const classEnd = currentIndex + className.length;

              // Check if cursor is within this class
              if (position.column >= classStart + 1 && position.column <= classEnd + 1) {
                hoveredClass = className;
                hoveredClassRange = {
                  startLineNumber: position.lineNumber,
                  startColumn: classStart + 1,
                  endLineNumber: position.lineNumber,
                  endColumn: classEnd + 1,
                };
                break;
              }

              currentIndex = classEnd;
            }

            if (hoveredClass && hoveredClassRange) {
              try {
                const cssResult = await candidatesToCss(designSystem, [hoveredClass]);

                if (cssResult && cssResult.length > 0 && cssResult[0]) {
                  const cssString = cssResult[0];

                  return {
                    range: hoveredClassRange,
                    contents: [
                      {
                        value: `\`\`\`css\n${cssString}\n\`\`\``,
                      },
                    ],
                  };
                }
              } catch (error) {
                console.warn("Error generating hover information for class:", hoveredClass, error);
              }
            }

            return null;
          } else {
            // Multiline @apply case - find class on current line
            const currentLineClasses = currentLine
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .map((cls) => cls.replace(/[;}]+$/, ""));
            let hoveredClass = null;
            let hoveredClassRange = null;

            for (const className of currentLineClasses) {
              if (!classNames.includes(className)) continue;

              const classStart = currentLine.indexOf(className);
              if (classStart === -1) continue;

              const classEnd = classStart + className.length;

              if (position.column >= classStart + 1 && position.column <= classEnd + 1) {
                hoveredClass = className;
                hoveredClassRange = {
                  startLineNumber: position.lineNumber,
                  startColumn: classStart + 1,
                  endLineNumber: position.lineNumber,
                  endColumn: classEnd + 1,
                };
                break;
              }
            }

            if (hoveredClass && hoveredClassRange) {
              try {
                const cssResult = await candidatesToCss(designSystem, [hoveredClass]);

                if (cssResult && cssResult.length > 0 && cssResult[0]) {
                  const cssString = cssResult[0];

                  return {
                    range: hoveredClassRange,
                    contents: [
                      {
                        value: `\`\`\`css\n${cssString}\n\`\`\``,
                      },
                    ],
                  };
                }
              } catch (error) {
                console.warn("Error generating hover information for class:", hoveredClass, error);
              }
            }

            return null;
          }
        },
      });
      monacoDisposables.value.push(hoverProvider);

      // Register color provider for modern CSS color functions
      const colorProvider = monaco.languages.registerColorProvider("css", {
        provideColorPresentations(model, colorInfo) {
          const { red, green, blue, alpha } = colorInfo.color;
          const color = new Color("srgb", [red, green, blue], alpha);

          // Get the line content to determine context
          const lineContent = model.getLineContent(colorInfo.range.startLineNumber);

          // Check if we're in an @apply directive with an arbitrary color class
          const applyMatch = lineContent.match(/@apply\s+([^;}]+)/);
          if (applyMatch) {
            const classList = applyMatch[1];

            // Parse class names, handling brackets that may contain spaces
            const classNames = [];
            let current = "";
            let bracketDepth = 0;

            for (let i = 0; i < classList.length; i++) {
              const char = classList[i];

              if (char === "[") {
                bracketDepth++;
                current += char;
              } else if (char === "]") {
                bracketDepth--;
                current += char;
              } else if (char === " " && bracketDepth === 0) {
                if (current.trim()) {
                  classNames.push(current.trim());
                  current = "";
                }
              } else {
                current += char;
              }
            }

            if (current.trim()) {
              classNames.push(current.trim());
            }

            // Find the class that contains this color range
            for (const className of classNames) {
              // Calculate exact position of this class in the line
              const applyStart = lineContent.indexOf("@apply");
              const classListStart = applyStart + "@apply".length;

              // Skip whitespace after @apply
              let currentPos = classListStart;
              while (currentPos < lineContent.length && /\s/.test(lineContent[currentPos])) {
                currentPos++;
              }

              // Find position of this specific class
              let classStartPos = -1;
              for (const name of classNames) {
                if (name === className) {
                  classStartPos = currentPos;
                  break;
                }
                currentPos += name.length;
                // Skip whitespace to next class
                while (currentPos < lineContent.length && /\s/.test(lineContent[currentPos])) {
                  currentPos++;
                }
              }

              if (classStartPos === -1) continue;

              const classStartColumn = classStartPos + 1; // Monaco is 1-indexed
              const classEndColumn = classStartColumn + className.length;

              // Check if the color range matches this class exactly and it's an arbitrary color
              if (
                colorInfo.range.startColumn === classStartColumn &&
                colorInfo.range.endColumn === classEndColumn &&
                /\[([#].+|rgb.+|rgba.+|hsl.+|hsla.+|lch.+|oklch.+|lab.+|oklab.+|hwb.+|color-mix.+)\]/.test(
                  className,
                )
              ) {
                // Extract the prefix (e.g., "bg-" from "bg-[#ff0000]")
                const bracketMatch = className.match(/^([^[]+)\[([^\]]+)\]$/);
                if (bracketMatch) {
                  const prefix = bracketMatch[1]; // e.g., "bg-"

                  // Helper function to convert Color.js format to Tailwind arbitrary value format
                  const toTailwindFormat = (colorStr: string) => {
                    // First, remove spaces around commas
                    let result = colorStr.replace(/\s*,\s*/g, ",");
                    // Then, replace remaining spaces with underscores
                    result = result.replace(/\s+/g, "_");
                    return result;
                  };

                  // Create color presentations with proper range that covers the entire class
                  const presentations = [
                    {
                      label: `${prefix}[${color.toString({ format: "hex" })}]`,
                    },
                    {
                      label: `${prefix}[rgb(${Math.round(red * 255)},${Math.round(green * 255)},${Math.round(blue * 255)})]`,
                    },
                    {
                      label: `${prefix}[rgba(${Math.round(red * 255)},${Math.round(green * 255)},${Math.round(blue * 255)},${alpha})]`,
                    },
                    {
                      label: `${prefix}[${toTailwindFormat(color.to("hsl").toString({ format: "hsl" }))}]`,
                    },
                    {
                      label: `${prefix}[${toTailwindFormat(color.to("hwb").toString({ format: "hwb" }))}]`,
                    },
                    {
                      label: `${prefix}[${toTailwindFormat(color.to("lch").toString({ format: "lch" }))}]`,
                    },
                    {
                      label: `${prefix}[${toTailwindFormat(color.to("oklch").toString({ format: "oklch" }))}]`,
                    },
                    {
                      label: `${prefix}[${toTailwindFormat(color.to("lab").toString({ format: "lab" }))}]`,
                    },
                    {
                      label: `${prefix}[${toTailwindFormat(color.to("oklab").toString({ format: "oklab" }))}]`,
                    },
                  ];

                  // Override the range to cover the entire class name for proper replacement
                  return presentations.map((presentation) => ({
                    ...presentation,
                    range: {
                      startLineNumber: colorInfo.range.startLineNumber,
                      startColumn: classStartColumn,
                      endLineNumber: colorInfo.range.endLineNumber,
                      endColumn: classEndColumn,
                    },
                  }));
                }
              }
            }
          }

          // Default color presentations for other contexts (@theme blocks, standalone color functions)
          return [
            {
              label: color.toString({ format: "hex" }),
            },
            {
              label: `rgb(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)})`,
            },
            {
              label: `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`,
            },
            {
              label: color.to("hsl").toString({ format: "hsl" }),
            },
            {
              label: color.to("hwb").toString({ format: "hwb" }),
            },
            {
              label: color.to("lch").toString({ format: "lch" }),
            },
            {
              label: color.to("oklch").toString({ format: "oklch" }),
            },
            {
              label: color.to("lab").toString({ format: "lab" }),
            },
            {
              label: color.to("oklab").toString({ format: "oklab" }),
            },
          ];
        },

        async provideDocumentColors(model) {
          const editableColors: monacoEditor.languages.IColorInformation[] = [];
          const nonEditableDecorations: monacoEditor.editor.IModelDeltaDecoration[] = [];
          const text = model.getValue();
          const processedRanges = new Set<string>();
          const isEditableColor = (className: string): boolean => {
            return /\[([#].+|rgb.+|rgba.+|hsl.+|hsla.+|lch.+|oklch.+|lab.+|oklab.+|hwb.+|color-mix.+)\]/.test(
              className,
            );
          };

          const createColorDecorationClass = (color: monacoEditor.languages.IColor): string => {
            const colorJs = new Color("srgb", [color.red, color.green, color.blue], color.alpha);
            const hex = colorJs.toString({ format: "hex" }).replace("#", "");
            return `windpress-color-decoration-${hex}`;
          };

          // Helper function to parse and add color (separating editable vs non-editable)
          const parseAndAddColor = (
            colorText: string,
            startIndex: number,
            endIndex: number,
            isEditable: boolean,
          ) => {
            // Create a unique key for this range
            const rangeKey = `${startIndex}-${endIndex}`;
            if (processedRanges.has(rangeKey)) {
              return; // Already processed this exact range
            }

            try {
              // Remove CSS comments before parsing color
              const cleanColorText = colorText
                .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, "")
                .trim();

              // Skip color-mix functions as they're not parseable by Color.js
              if (cleanColorText.startsWith("color-mix(")) {
                return;
              }

              // Let Color.js handle all the parsing
              const color = new Color(cleanColorText);

              // Convert to sRGB for Monaco Editor
              const srgb = color.to("srgb");
              const [red, green, blue] = srgb.coords;

              const startPosition = model.getPositionAt(startIndex);
              const endPosition = model.getPositionAt(endIndex);

              const colorInfo = {
                red: Math.max(0, Math.min(1, red ?? 0)),
                green: Math.max(0, Math.min(1, green ?? 0)),
                blue: Math.max(0, Math.min(1, blue ?? 0)),
                alpha: srgb.alpha ?? 1,
              };

              const range = {
                startLineNumber: startPosition.lineNumber,
                startColumn: startPosition.column,
                endLineNumber: endPosition.lineNumber,
                endColumn: endPosition.column,
              };

              if (isEditable) {
                // Editable colors: returned by provideDocumentColors (Monaco shows color picker)
                editableColors.push({
                  color: colorInfo,
                  range: range,
                });
              } else {
                const decorationClassName = createColorDecorationClass(colorInfo);

                const colorJs = new Color(
                  "srgb",
                  [colorInfo.red, colorInfo.green, colorInfo.blue],
                  colorInfo.alpha,
                );
                const hex = colorJs.toString({ format: "hex" });

                // Batch style creation to reduce DOM manipulation
                if (!colorDecorationClasses.has(decorationClassName)) {
                  if (!colorStyleElement) {
                    colorStyleElement = document.createElement("style");
                    colorStyleElement.setAttribute("data-windpress-colors", "true");
                    document.head.appendChild(colorStyleElement);
                  }

                  colorDecorationClasses.add(decorationClassName);
                  colorStyleElement.textContent += `.${decorationClassName} { background-color: ${hex}; }\n`;
                }

                nonEditableDecorations.push({
                  range: range,
                  options: {
                    before: {
                      content: "\u00A0",
                      inlineClassName: `${decorationClassName} colorpicker-color-decoration`,
                      inlineClassNameAffectsLetterSpacing: true,
                    },
                  },
                });
              }

              processedRanges.add(rangeKey); // Mark this range as processed
            } catch (error) {
              // Skip invalid color values
              console.warn("Invalid color format:", colorText, error);
            }
          };

          // Get shared design system and variables list for color resolution
          const { designSystem, variablesList } = await getDesignSystemData();

          // If design system failed to load, return empty results
          if (!designSystem || !variablesList) {
            return editableColors;
          }

          // 1. Find colors in @apply directives using the WindPress process
          const applyRegex = /@apply\s+([^;}]+)/g;
          let applyMatch: RegExpExecArray | null;

          while ((applyMatch = applyRegex.exec(text)) !== null) {
            const classList = applyMatch[1];
            const classNames = classList.split(/\s+/).filter(Boolean);

            for (const className of classNames) {
              try {
                // Determine if this class is editable based on the class name itself
                const isEditable = isEditableColor(className);

                // 1. Generate CSS for the class using candidatesToCss
                const cssResult = await candidatesToCss(designSystem, [className]);

                if (cssResult && cssResult.length > 0) {
                  const cssString = cssResult.join("\n");
                  let colorValue = null;

                  if (isEditable) {
                    // For arbitrary/editable classes, extract color from generated CSS
                    // This handles all color formats consistently via candidatesToCss
                    const directColorMatch = cssString.match(
                      /(background-color|color|border-color|fill|stroke|border-top-color|border-right-color|border-bottom-color|border-left-color):\s*([^;]+)/,
                    );

                    if (directColorMatch) {
                      const cssColorValue = directColorMatch[2].trim();
                      // Skip CSS variables and transparent values
                      if (
                        !cssColorValue.startsWith("var(") &&
                        !cssColorValue.includes("transparent") &&
                        cssColorValue !== "currentColor"
                      ) {
                        colorValue = cssColorValue;
                      }
                    }
                  } else {
                    // For standard classes, find CSS color variables in the generated CSS
                    const colorVarMatch = cssString.match(/var\((--[^)]*color[^)]*)\)/);

                    if (colorVarMatch) {
                      const colorVarName = colorVarMatch[1]; // e.g., "--color-red-500"

                      // Search for the variable in the variables list
                      const colorVariable = variablesList.find((v: any) => v.key === colorVarName);

                      if (colorVariable && colorVariable.value) {
                        colorValue = colorVariable.value;
                      }
                    }
                  }

                  // If we found a color value, add it to the color preview
                  if (colorValue) {
                    // Calculate the correct position of the class name in the @apply directive
                    const applyStart = applyMatch!.index;
                    const classListStart = applyStart + applyMatch![0].indexOf(classList);

                    // Find the exact position of this class within the class list
                    let currentPos = 0;
                    let classStartInList = -1;

                    for (const name of classNames) {
                      // Skip whitespace
                      while (currentPos < classList.length && /\s/.test(classList[currentPos])) {
                        currentPos++;
                      }

                      if (name === className) {
                        classStartInList = currentPos;
                        break;
                      }

                      currentPos += name.length;
                    }

                    if (classStartInList !== -1) {
                      const colorStartIndex = classListStart + classStartInList;
                      const colorEndIndex = colorStartIndex + className.length;

                      parseAndAddColor(colorValue, colorStartIndex, colorEndIndex, isEditable);
                    }
                  }
                }
              } catch (error) {
                // Skip classes that can't be processed
                console.warn("Error processing class for color preview:", className, error);
              }
            }
          }

          // 2. Find colors in @theme blocks
          const themeBlockRegex = /@theme\s*\{([^}]*)\}/gs;
          let themeMatch;

          while ((themeMatch = themeBlockRegex.exec(text)) !== null) {
            const themeContent = themeMatch[1];
            const themeStartIndex = themeMatch.index + themeMatch[0].indexOf("{") + 1;

            // Find all property values in the theme block that could be colors
            const propertyRegex = /--color-(?!\*)[^:]+:\s*([^;]+);/g;
            let propertyMatch;

            while ((propertyMatch = propertyRegex.exec(themeContent)) !== null) {
              const fullMatch = propertyMatch[0]; // e.g., "--color-primary: #007bff;"
              const value = propertyMatch[1].trim(); // e.g., "#007bff"

              // Find the actual position of the value in the original text
              const propertyStartInTheme = propertyMatch.index;
              const colonIndex = fullMatch.indexOf(":");
              const valueStartInProperty = fullMatch.substring(colonIndex + 1).search(/\S/); // Find first non-whitespace after colon
              const valueStartInTheme =
                propertyStartInTheme + colonIndex + 1 + valueStartInProperty;
              const valueStart = themeStartIndex + valueStartInTheme;
              const valueEnd = valueStart + value.length;

              // Handle all colors in @theme blocks - these are always editable since they're custom values
              parseAndAddColor(value, valueStart, valueEnd, true);
            }
          }

          // 3. Find modern color functions outside @theme blocks and @apply directives that Monaco doesn't support by default
          // Only handle modern CSS color functions, let Monaco handle standard ones (rgb, hsl, hex, etc.)
          const colorPatterns = [
            /\b(oklch|oklab|lch|lab)\(([^)]*(?!\bvar\b|\benv\b|\bcalc\b)[^)]*)\)/gi,
          ];

          // Create a set of ranges that are inside @theme blocks and @apply directives to avoid duplicates
          const excludedRanges: Array<{ start: number; end: number }> = [];

          // Add @theme block ranges
          const themeBlockRegexForRanges = /@theme\s*\{([^}]*)\}/gs;
          let themeRangeMatch;
          while ((themeRangeMatch = themeBlockRegexForRanges.exec(text)) !== null) {
            const blockStart = themeRangeMatch.index;
            const blockEnd = themeRangeMatch.index + themeRangeMatch[0].length;
            excludedRanges.push({ start: blockStart, end: blockEnd });
          }

          // Add @apply directive ranges
          const applyRegexForRanges = /@apply\s+([^;}]+)/g;
          let applyRangeMatch;
          while ((applyRangeMatch = applyRegexForRanges.exec(text)) !== null) {
            const blockStart = applyRangeMatch.index;
            const blockEnd = applyRangeMatch.index + applyRangeMatch[0].length;
            excludedRanges.push({ start: blockStart, end: blockEnd });
          }

          colorPatterns.forEach((pattern) => {
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(text)) !== null) {
              // Skip if contains variables or functions we don't want to process
              if (
                match[0].includes("var(") ||
                match[0].includes("env(") ||
                match[0].includes("calc(")
              ) {
                continue;
              }

              // Check if this color is inside any excluded range (@theme blocks or @apply directives)
              const isInsideExcludedRange = excludedRanges.some(
                (range) =>
                  match!.index >= range.start && match!.index + match![0].length <= range.end,
              );

              if (!isInsideExcludedRange) {
                // Modern CSS color functions outside @theme/@apply are always editable since they're custom values
                parseAndAddColor(match[0], match.index, match.index + match[0].length, true);
              }
            }
            pattern.lastIndex = 0; // Reset regex state
          });

          // Apply non-editable color decorations to the model
          if (nonEditableDecorations.length > 0) {
            // Store current decorations to clean up later
            const currentDecorations = (model as any).__windpressColorDecorations || [];
            (model as any).__windpressColorDecorations = model.deltaDecorations(
              currentDecorations,
              nonEditableDecorations,
            );
          }

          // Return only editable colors (Monaco will show color picker for these)
          return editableColors;
        },
      });
      monacoDisposables.value.push(colorProvider);
    }; // End registerProviders

    const getTailwindImportThemeRanges = (model: monacoEditor.editor.ITextModel) => {
      const text = model.getValue();
      const ranges: Array<{ start: number; end: number }> = [];
      const importRegex = /@import\s+[^;]*\btheme\s*\(\s*[-\w]+\s*\)\s*;/g;
      let importMatch: RegExpExecArray | null;

      while ((importMatch = importRegex.exec(text)) !== null) {
        const themeMatch = /\btheme\s*\(\s*[-\w]+\s*\)/.exec(importMatch[0]);
        if (!themeMatch || themeMatch.index === undefined) {
          continue;
        }

        const start = importMatch.index + themeMatch.index;
        ranges.push({ start, end: start + themeMatch[0].length });
      }

      return ranges;
    };

    const toMarkerData = (
      marker: monacoEditor.editor.IMarker,
    ): monacoEditor.editor.IMarkerData => ({
      severity: marker.severity,
      startLineNumber: marker.startLineNumber,
      startColumn: marker.startColumn,
      endLineNumber: marker.endLineNumber,
      endColumn: marker.endColumn,
      message: marker.message,
      source: marker.source,
      code: marker.code,
      tags: marker.tags,
      relatedInformation: marker.relatedInformation,
    });

    const filterTailwindImportThemeMarkers = () => {
      const model = editor.getModel();
      if (!model || model.getLanguageId() !== "css") {
        return;
      }

      const themeRanges = getTailwindImportThemeRanges(model);
      if (themeRanges.length === 0) {
        return;
      }

      const cssMarkers = monaco.editor.getModelMarkers({
        owner: "css",
        resource: model.uri,
      });

      if (cssMarkers.length === 0) {
        return;
      }

      let didFilter = false;
      const filteredMarkers = cssMarkers.filter((marker) => {
        const markerCode = typeof marker.code === "string" ? marker.code : marker.code?.value;

        if (markerCode !== "css-semicolonexpected" && markerCode !== "css-lcurlyexpected") {
          return true;
        }

        const markerStart = model.getOffsetAt({
          lineNumber: marker.startLineNumber,
          column: marker.startColumn,
        });
        const markerEnd = model.getOffsetAt({
          lineNumber: marker.endLineNumber,
          column: marker.endColumn,
        });

        const isTailwindThemeMarker = themeRanges.some((range) => {
          return markerStart >= range.start && markerEnd <= range.end;
        });

        if (isTailwindThemeMarker) {
          didFilter = true;
          return false;
        }

        return true;
      });

      if (!didFilter) {
        return;
      }

      monaco.editor.setModelMarkers(model, "css", filteredMarkers.map(toMarkerData));
    };

    if (!(window as any).__windpressMonacoInstantiated) {
      monacoCssDefaults.setOptions(
        Object.assign(monacoCssDefaults.options, {
          data: {
            useDefaultDataProvider: true,
            dataProviders: {
              tailwindcss: {
                version: 1.1,
                atDirectives: [
                  {
                    name: "@theme",
                    status: "standard",
                    description: __(
                      "Theme variables are special CSS variables defined using the `@theme` directive that influence which utility classes exist in your project.",
                      "windpress",
                    ),
                    references: [
                      {
                        name: __("Docs: Theme variables", "windpress"),
                        url: "https://tailwindcss.com/docs/theme",
                      },
                    ],
                  },
                  {
                    name: "@plugin",
                    status: "standard",
                    description: __(
                      "Use the `@plugin` directive to load a legacy JavaScript-based plugin.",
                      "windpress",
                    ),
                    references: [
                      {
                        name: __("Docs: Functions & Directives", "windpress"),
                        url: "https://tailwindcss.com/docs/functions-and-directives#plugin-directive",
                      },
                      {
                        name: __("Docs: Tailwind CSS plugins", "windpress"),
                        url: "https://windpress.jooo.si/docs/configuration/file-main-css#tailwind-css-plugins",
                      },
                    ],
                  },
                  {
                    name: "@config",
                    status: "standard",
                    description: __(
                      "Use the `@config` directive to load a legacy JavaScript-based configuration file.",
                      "windpress",
                    ),
                    references: [
                      {
                        name: __("Docs: Functions & Directives", "windpress"),
                        url: "https://tailwindcss.com/docs/functions-and-directives#config-directive",
                      },
                      {
                        name: __("Docs: Tailwind CSS configuration", "windpress"),
                        url: "https://windpress.jooo.si/docs/configuration/file-main-css#tailwind-css-configuration",
                      },
                    ],
                  },
                  {
                    name: "@tailwind",
                    status: "standard",
                    description: __(
                      "Use the `@tailwind` directive to insert Tailwind's `base`, `components`, `utilities` and `variants` styles into your CSS.",
                      "windpress",
                    ),
                    references: [
                      {
                        name: __("Docs: Tailwind CSS functions & directives", "windpress"),
                        url: "https://v3.tailwindcss.com/docs/functions-and-directives#tailwind",
                      },
                    ],
                  },
                  {
                    name: "@apply",
                    status: "standard",
                    description: __(
                      "Use the `@apply` directive to inline any existing utility classes into your own custom CSS.",
                      "windpress",
                    ),
                    references: [
                      {
                        name: __("Docs: Tailwind CSS functions & directives", "windpress"),
                        url: "https://tailwindcss.com/docs/functions-and-directives#apply-directive",
                      },
                    ],
                  },
                  {
                    name: "@utility",
                    status: "standard",
                    description: __(
                      "Use the `@utility` directive to add custom utilities to your project that work with variants like `hover`, `focus` and `lg``.",
                      "windpress",
                    ),
                    references: [
                      {
                        name: __("Docs: Tailwind CSS functions & directives", "windpress"),
                        url: "https://tailwindcss.com/docs/functions-and-directives#utility-directive",
                      },
                    ],
                  },
                  {
                    name: "@custom-variant",
                    status: "standard",
                    description: __(
                      "Use the `@custom-variant` directive to add a custom variant in your project.",
                      "windpress",
                    ),
                    references: [
                      {
                        name: __("Docs: Tailwind CSS functions & directives", "windpress"),
                        url: "https://tailwindcss.com/docs/functions-and-directives#custom-variant-directive",
                      },
                    ],
                  },
                  {
                    name: "@variant",
                    status: "standard",
                    description: __(
                      "Use the `@variant` directive to apply a Tailwind variant to styles in your CSS.",
                      "windpress",
                    ),
                    references: [
                      {
                        name: __("Docs: Tailwind CSS functions & directives", "windpress"),
                        url: "https://tailwindcss.com/docs/functions-and-directives#variant-directive",
                      },
                    ],
                  },
                  {
                    name: "@source",
                    status: "standard",
                    description: __(
                      "Use the `@source` directive to scan additional source files.",
                      "windpress",
                    ),
                    references: [
                      {
                        name: __("Docs: Scanning additional Sources", "windpress"),
                        url: "https://windpress.jooo.si/docs/configuration/file-main-css#scanning-additional-sources",
                      },
                    ],
                  },
                  {
                    name: "@layer",
                    status: "standard",
                    description: __(
                      "Use the `@layer` directive to tell Tailwind which “bucket” a set of custom styles belong to. Valid layers are `base`, `components`, and `utilities`.",
                    ),
                    references: [
                      {
                        name: __("Docs: Functions & Directives", "windpress"),
                        url: "https://v3.tailwindcss.com/docs/functions-and-directives#layer",
                      },
                    ],
                  },
                ],
              },
            },
          },
        }),
      );

      (window as any).__windpressMonacoInstantiated = true;
    }

    // Providers capture the current editor's caches and stores. Register them
    // for this editor instance and dispose them with the component so a later
    // editor mount does not inherit stale providers or depend on the global
    // CSS-defaults guard above.
    providerRegistrationTimer = setTimeout(() => {
      providerRegistrationTimer = null;
      registerProviders();
    }, 100);

    const model = editor.getModel();
    if (model && model.getLanguageId() === "css") {
      monacoDisposables.value.push(
        monaco.editor.onDidChangeMarkers((resources) => {
          const hasCurrentModel = resources.some(
            (resource) => resource.toString() === model.uri.toString(),
          );
          if (!hasCurrentModel) {
            return;
          }

          filterTailwindImportThemeMarkers();
        }),
      );

      filterTailwindImportThemeMarkers();
    }

    clearDesignSystemCache();
  }

  // Editor actions are editor-specific, so we track them for cleanup
  monacoDisposables.value.push(
    monaco.editor.addEditorAction({
      id: "windpress-save-" + Date.now(), // Make ID unique per editor instance
      label: __("Save", "windpress"),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        emit("save");
      },
    }),
  );
}

watch(
  () => props.entry.relative_path,
  async (newPath, oldPath) => {
    if (!isEditorMounted.value || !editorElementRef.value || !monacoInstanceRef.value) {
      return;
    }

    if (oldPath && oldPath !== newPath) {
      const viewState = editorElementRef.value.saveViewState();
      if (viewState) {
        await workspace.viewState.save(oldPath, viewState);
      }
    }

    await nextTick();
    await workspace.openTextDocument(newPath, editorElementRef.value);
  },
);

// Cleanup function to prevent memory leaks
onBeforeUnmount(() => {
  if (providerRegistrationTimer !== null) {
    clearTimeout(providerRegistrationTimer);
    providerRegistrationTimer = null;
  }

  // Clean up editor-specific Monaco disposables (content change handler and editor actions)
  monacoDisposables.value.forEach((disposable) => {
    try {
      disposable.dispose();
    } catch (error) {
      console.warn("Error disposing Monaco disposable:", error);
    }
  });
  monacoDisposables.value = [];

  // Clean up shared style element
  if (colorStyleElement) {
    colorStyleElement.remove();
    colorStyleElement = null;
  }
  colorDecorationClasses.clear();

  // Clean up editor decorations
  if (editorElementRef.value) {
    const model = editorElementRef.value.getModel();
    if (model && (model as any).__windpressColorDecorations) {
      model.deltaDecorations((model as any).__windpressColorDecorations, []);
      delete (model as any).__windpressColorDecorations;
    }
  }
});
</script>

<template>
  <UDashboardPanel id="explorer-2" class="min-h-[calc(100svh-var(--wp-admin--admin-bar--height))]">
    <UDashboardNavbar :title="entry?.relative_path" :toggle="false" :ui="{ title: 'text-sm' }">
      <template #leading>
        <UTooltip :text="i18n.__('Close', 'windpress')">
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            class="-ms-1.5"
            @click="emit('close')"
          />
        </UTooltip>
      </template>

      <template #title>
        <UIcon
          :name="`vscode-icons:file-type-${entry?.relative_path === 'main.css' ? 'tailwind' : path.extname(entry?.relative_path ?? '').replace('.', '')}`"
          class="size-5"
        />
        {{ entry?.relative_path }}
        <UBadge
          v-if="props.entry.readonly"
          :label="i18n.__('read-only', 'windpress')"
          color="warning"
          variant="outline"
        />
        <UTooltip
          v-if="entry?.path_on_disk"
          :text="`${i18n.__('Path on disk', 'windpress')}: ${entry?.path_on_disk}`"
        >
          <span class="text-xs opacity-60 font-normal">
            [
            <UIcon name="i-lucide-hard-drive" class="inline-block align-middle me-1" />
            {{ entry?.path_on_disk }}
            ]
          </span>
        </UTooltip>
      </template>

      <template #right>
        <UTooltip
          v-if="
            entry?.relative_path !== 'main.css' &&
            !(
              Number(settingsStore.virtualOptions('general.tailwindcss.version', 4).value) === 3 &&
              (entry?.relative_path === 'tailwind.config.js' ||
                entry?.relative_path === 'wizard.js')
            )
          "
          :text="i18n.__('Delete', 'windpress')"
        >
          <UButton
            icon="i-lucide-trash"
            color="neutral"
            variant="ghost"
            @click="emit('delete', entry)"
          />
        </UTooltip>

        <UTooltip
          v-if="
            entry?.relative_path === 'main.css' ||
            entry?.relative_path === 'wizard.css' ||
            (Number(settingsStore.virtualOptions('general.tailwindcss.version', 4).value) === 3 &&
              (entry?.relative_path === 'tailwind.config.js' ||
                entry?.relative_path === 'wizard.js'))
          "
          :text="i18n.__('Reset to default', 'windpress')"
        >
          <UButton
            icon="lucide:file-minus-2"
            color="neutral"
            variant="ghost"
            @click="emit('reset', entry)"
          />
        </UTooltip>

        <UTooltip :text="i18n.__('Save', 'windpress')">
          <UChip v-if="volumeStore.entryHasChanged(entry?.relative_path)" color="warning" size="md">
            <UButton icon="i-lucide-save" color="primary" variant="subtle" @click="emit('save')" />
          </UChip>
          <UButton
            v-else
            icon="i-lucide-save"
            color="primary"
            variant="subtle"
            @click="emit('save')"
          />
        </UTooltip>
      </template>
    </UDashboardNavbar>

    <div class="flex-1 overflow-y-auto relative">
      <!-- Floating Error Icon/Panel -->
      <Transition
        enter-active-class="transition-all duration-500 ease-out"
        leave-active-class="transition-all duration-300 ease-in"
        enter-from-class="scale-50 opacity-0 translate-y-4"
        enter-to-class="scale-100 opacity-100 translate-y-0"
        leave-from-class="scale-100 opacity-100 translate-y-0"
        leave-to-class="scale-50 opacity-0 translate-y-4"
      >
        <div v-if="cssErrors.hasErrors" class="absolute bottom-5 left-5 z-50">
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            leave-active-class="transition-all duration-200 ease-in"
            enter-from-class="scale-75 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-75 opacity-0"
            mode="out-in"
          >
            <!-- Collapsed state: floating icon -->
            <div
              v-if="!errorPanelExpanded"
              key="icon"
              class="bg-(--ui-bg)/30 backdrop-blur-md border border-error/20 rounded-lg p-3 shadow-xl hover:scale-110 transition-transform origin-bottom-left cursor-pointer"
              @click="errorPanelExpanded = true"
            >
              <UIcon name="lucide:alert-triangle" class="size-4 text-error flex-shrink-0" />
            </div>

            <!-- Expanded state: error panel -->
            <div
              v-else
              key="panel"
              class="bg-(--ui-bg)/30 backdrop-blur-md border border-error/20 rounded-lg p-4 shadow-xl min-w-80 max-w-96 origin-bottom-left"
            >
              <div class="flex items-start gap-3">
                <UIcon
                  name="lucide:alert-triangle"
                  class="size-4 text-error mt-0.5 flex-shrink-0"
                />
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-2">
                    <p class="font-medium text-error text-sm">
                      {{ i18n.__("CSS Validation Error", "windpress") }}
                    </p>
                    <UButton
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-x"
                      color="neutral"
                      @click="errorPanelExpanded = false"
                    />
                  </div>
                  <p class="text-sm mb-2">{{ cssErrors.errors[0]?.message }}</p>
                  <div v-if="cssErrors.errors[0]?.line" class="text-xs text-muted">
                    {{ i18n.__("Line", "windpress") }} {{ cssErrors.errors[0].line
                    }}{{
                      cssErrors.errors[0]?.column
                        ? `, ${i18n.__("Column", "windpress")} ${cssErrors.errors[0].column}`
                        : ""
                    }}
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>

      <vue-monaco-editor
        v-model:value="props.entry.content"
        :path="workspace.modelUri(entry.relative_path)"
        :language="props.entry.relative_path.endsWith('.css') ? 'css' : 'javascript'"
        :saveViewState="false"
        :options="{ ...MONACO_EDITOR_OPTIONS, readOnly: props.entry.readonly }"
        @mount="handleEditorMount"
        :theme="colorMode === 'dark' ? 'vs-dark' : 'vs'"
      />
    </div>
  </UDashboardPanel>
</template>
