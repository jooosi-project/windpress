import { parse as cssToolsParse, stringify as cssToolsStringify } from "@adobe/css-tools";

/**
 * @see https://tailwindcss.com/docs/theme#theme-variable-namespaces
 *
 * Supported CSS variable namespaces and their utility classes:
 * - --color-*          Color utilities like bg-red-500, text-sky-300, and many more
 * - --font-*           Font family utilities like font-sans
 * - --text-*           Font size utilities like text-xl
 * - --font-weight-*    Font weight utilities like font-bold (excluded from font namespace)
 * - --tracking-*       Letter spacing utilities like tracking-wide
 * - --leading-*        Line height utilities like leading-tight
 * - --breakpoint-*     Responsive breakpoint variants like sm:*
 * - --container-*      Container query variants like @sm:* and size utilities like max-w-md
 * - --spacing-*        Spacing and sizing utilities like px-4, max-h-16, and many more
 * - --radius-*         Border radius utilities like rounded-sm
 * - --shadow-*         Box shadow utilities like shadow-md
 * - --inset-shadow-*   Inset box shadow utilities like inset-shadow-xs
 * - --drop-shadow-*    Drop shadow filter utilities like drop-shadow-md
 * - --blur-*           Blur filter utilities like blur-md
 * - --perspective-*    Perspective utilities like perspective-near
 * - --aspect-*         Aspect ratio utilities like aspect-video
 * - --ease-*           Transition timing function utilities like ease-out
 * - --animate-*        Animation utilities like animate-spin
 */

/**
 * Example of how nested CSS variables are handled:
 *
 * Input CSS:
 * --color-primary: #fff;
 * --color-primary-card: #ff2;
 * --color-primary-card-front: #000;
 *
 * Parsed nested structure:
 * theme.namespaces.color = {
 *   primary: {
 *     $value: "#fff",        // --color-primary
 *     card: {
 *       $value: "#ff2",      // --color-primary-card
 *       front: "#000"        // --color-primary-card-front
 *     }
 *   }
 * }
 *
 * Serialized back to CSS:
 * --color-primary: #fff;
 * --color-primary-card: #ff2;
 * --color-primary-card-front: #000;
 */

// =============================================================================
// Types
// =============================================================================

/** Recursive type for nested theme values that supports both direct values and nested children */
type NestedThemeValue<T = string> = T | NestedThemeObject<T>;

/** Object type for nested theme values with optional direct value */
type NestedThemeObject<T = string> = {
  $value?: T; // Direct value when the property also has nested children
} & { [key: string]: NestedThemeValue<T> };

/** Theme namespaces with their corresponding CSS variable prefixes */
export interface ThemeNamespaces {
  color: Record<string, NestedThemeValue>;
  text: Record<string, NestedThemeValue>;
  font: Record<string, NestedThemeValue>;
  spacing: Record<string, NestedThemeValue>;
  breakpoint: Record<string, NestedThemeValue>;
}

/** Main wizard theme structure */
export interface WizardTheme {
  /** The original CSS content of the wizard file */
  source?: string;
  /** The parsed AST of the CSS file, if available */
  ast?: any;
  /** Should always generate all CSS variables? `@theme static` */
  isStatic?: boolean;
  /** Completely disable the default theme. The CSS prop/var is `--* = initial` */
  isInitial?: boolean;
  /** Default spacing multiplier, e.g. '0.25rem'. The CSS prop/var key is `--spacing` */
  spacing?: string;
  /** Theme variable namespaces */
  namespaces: ThemeNamespaces;
}

// =============================================================================
// Constants
// =============================================================================

/** Supported theme namespaces and their handling rules */
const THEME_NAMESPACES = {
  color: { supportsNesting: true },
  text: { supportsNesting: true },
  font: { supportsNesting: true, excludePatterns: ["weight"] },
  spacing: { supportsNesting: true },
  breakpoint: { supportsNesting: true },
} as const;

/** Special CSS properties that require special handling */
const SPECIAL_PROPERTIES = {
  INITIAL_MARKER: "--*",
  SPACING_MULTIPLIER: "--spacing",
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Sets a nested value in an object using a path array
 * Handles the case where a property can have both a direct value and nested children
 * @param obj - The target object
 * @param path - Array of keys representing the path
 * @param value - The value to set
 */
function setNestedValue(obj: any, path: string[], value: string): void {
  let current = obj;

  // Navigate to the parent of the final key
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key]) {
      current[key] = {};
    } else if (typeof current[key] === "string") {
      // Convert string value to object with special '$value' key for the original value
      const originalValue = current[key];
      current[key] = { $value: originalValue };
    }
    current = current[key];
  }

  // Set the final value
  const finalKey = path[path.length - 1];
  if (
    current[finalKey] &&
    typeof current[finalKey] === "object" &&
    current[finalKey].$value === undefined
  ) {
    // There are already nested properties, add the value as $value
    current[finalKey].$value = value;
  } else if (
    current[finalKey] &&
    typeof current[finalKey] === "object" &&
    current[finalKey].$value !== undefined
  ) {
    // Update existing $value
    current[finalKey].$value = value;
  } else {
    // Simple case - no existing nested properties
    current[finalKey] = value;
  }
}

/**
 * Flattens a nested object into CSS custom properties
 * Handles the special $value key for properties that have both direct values and nested children
 * @param obj - The nested object to flatten
 * @param prefix - The CSS variable prefix
 * @returns Array of property-value pairs
 */
function flattenNestedObject(obj: any, prefix: string): Array<{ property: string; value: string }> {
  const result: Array<{ property: string; value: string }> = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      // This is a leaf node, create the CSS custom property only if value is not empty
      if (value && value.trim() !== "") {
        result.push({ property: `--${prefix}-${key}`, value });
      }
    } else if (typeof value === "object" && value !== null) {
      // Check if this object has a direct value (using $value key)
      const valueObj = value as any;
      if ("$value" in valueObj && typeof valueObj.$value === "string") {
        // Add the direct value for this level only if it's not empty
        if (valueObj.$value && valueObj.$value.trim() !== "") {
          result.push({ property: `--${prefix}-${key}`, value: valueObj.$value });
        }

        // Process nested properties (excluding $value)
        const nestedObj = { ...valueObj };
        delete nestedObj.$value;
        if (Object.keys(nestedObj).length > 0) {
          const nestedResults = flattenNestedObject(nestedObj, `${prefix}-${key}`);
          result.push(...nestedResults);
        }
      } else {
        // This is a nested object without direct value, recurse deeper
        const nestedResults = flattenNestedObject(value, `${prefix}-${key}`);
        result.push(...nestedResults);
      }
    }
  }

  return result;
}

/**
 * Adds or updates a CSS declaration in a declarations array
 * If value is empty, removes the declaration instead
 * @param declarations - The declarations array to modify
 * @param property - The CSS property name
 * @param value - The CSS property value
 */
function addOrUpdateDeclaration(
  declarations: Array<{ type: "declaration"; property: string; value: string }>,
  property: string,
  value: string,
): void {
  const existingIndex = declarations.findIndex((decl) => decl.property === property);

  // If value is empty, null, or undefined, remove the declaration
  if (!value || value.trim() === "") {
    if (existingIndex !== -1) {
      declarations.splice(existingIndex, 1);
    }
    return;
  }

  if (existingIndex !== -1) {
    // Update existing declaration
    declarations[existingIndex].value = value;
  } else {
    // Add new declaration
    declarations.push({ type: "declaration", property, value });
  }
}

/**
 * Checks if a CSS property should be excluded from a namespace
 * @param namespace - The namespace to check
 * @param key - The property key
 * @returns Whether the property should be excluded
 */
function shouldExcludeProperty(namespace: string, key: string): boolean {
  const config = THEME_NAMESPACES[namespace as keyof typeof THEME_NAMESPACES];
  if (!config || !("excludePatterns" in config)) return false;

  return config.excludePatterns?.some((pattern) => key.startsWith(pattern)) ?? false;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Creates a default empty theme object
 * @returns A new WizardTheme with empty namespaces
 */
export function getDefaultTheme(): WizardTheme {
  return {
    namespaces: {
      color: {},
      text: {},
      font: {},
      spacing: {},
      breakpoint: {},
    },
  };
}

/**
 * Parses a CSS file content and extracts theme information
 * @param fileContent - The CSS content to parse
 * @returns A WizardTheme object
 */
export function parseWizardFile(fileContent: string): WizardTheme {
  const theme: WizardTheme = getDefaultTheme();

  // Store the original source
  theme.source = fileContent;

  try {
    const ast = cssToolsParse(fileContent);
    theme.ast = ast;

    // Find and process the @theme rule
    if (ast.stylesheet?.rules) {
      for (const rule of ast.stylesheet.rules) {
        if (rule.type === "rule" && rule.selectors) {
          const themeSelector = rule.selectors.find((selector: string) =>
            selector.startsWith("@theme"),
          );

          if (themeSelector) {
            // Parse @theme modifiers
            if (themeSelector === "@theme static") {
              theme.isStatic = true;
            }

            // Process declarations
            if (rule.declarations) {
              for (const declaration of rule.declarations) {
                if (declaration.type === "declaration" && declaration.property.startsWith("--")) {
                  processDeclaration(theme, declaration.property, declaration.value);
                }
              }
            }
            break; // Found the @theme rule, no need to continue
          }
        }
      }
    }
  } catch (error) {
    console.error("Error parsing CSS:", error);
  }

  return theme;
}

/**
 * Processes a CSS declaration and adds it to the appropriate theme namespace
 * @param theme - The theme object to modify
 * @param property - The CSS property name
 * @param value - The CSS property value
 */
function processDeclaration(theme: WizardTheme, property: string, value: string): void {
  // Check if the property is literally '--*' with value 'initial' to set isInitial flag
  if (property === SPECIAL_PROPERTIES.INITIAL_MARKER && value === "initial") {
    theme.isInitial = true;
    return;
  }

  // Handle special cases first
  if (property === SPECIAL_PROPERTIES.SPACING_MULTIPLIER) {
    theme.spacing = value;
    return;
  }

  // Extract the namespace and key from the property name
  const match = property.match(/^--([^-]+)-(.+)$/);
  if (!match) {
    return; // Skip properties that don't follow the pattern
  }

  const [, namespace, key] = match;

  // Check if this namespace is supported
  if (!(namespace in THEME_NAMESPACES)) {
    return; // Skip unsupported namespaces
  }

  // Check if this property should be excluded
  if (shouldExcludeProperty(namespace, key)) {
    return;
  }

  // Process the property based on namespace
  if (namespace === "breakpoint") {
    // Breakpoints now support nesting like other namespaces
    const parts = key.split("-");
    setNestedValue(theme.namespaces.breakpoint, parts, value);
  } else {
    // Other namespaces support nesting
    const parts = key.split("-");
    setNestedValue(theme.namespaces[namespace as keyof ThemeNamespaces], parts, value);
  }
}

/**
 * Serializes theme namespaces to CSS declarations
 * @param theme - The theme object
 * @param declarations - The declarations array to modify
 */
function serializeNamespaces(
  theme: WizardTheme,
  declarations: Array<{ type: "declaration"; property: string; value: string }>,
): void {
  const { namespaces } = theme;

  // Serialize each namespace
  Object.entries(namespaces).forEach(([namespace, values]) => {
    if (!values || Object.keys(values).length === 0) return;

    // All namespaces now support nesting
    const properties = flattenNestedObject(values, namespace);
    properties.forEach(({ property, value }) => {
      addOrUpdateDeclaration(declarations, property, value);
    });
  });
}

/**
 * Converts a theme object back to CSS file content
 * @param theme - The theme object to serialize
 * @returns CSS string
 */
export function stringifyTheme(theme: WizardTheme): string {
  try {
    // If we have the original AST, use it as the base and update it
    if (theme.ast) {
      return updateExistingAST(theme);
    }

    // Fallback: create new AST if original AST is not available
    return createNewAST(theme);
  } catch (error) {
    console.error("Error stringifying theme:", error);
    return "";
  }
}

/**
 * Updates an existing AST with theme data
 * @param theme - The theme object
 * @returns CSS string
 */
function updateExistingAST(theme: WizardTheme): string {
  const ast = JSON.parse(JSON.stringify(theme.ast)); // Deep clone the original AST

  // Find the @theme rule and update its declarations
  if (ast.stylesheet?.rules) {
    for (const rule of ast.stylesheet.rules) {
      if (rule.type === "rule" && rule.selectors) {
        const themeSelector = rule.selectors.find((selector: string) =>
          selector.startsWith("@theme"),
        );

        if (themeSelector) {
          // Update the selector based on theme flags
          rule.selectors = [theme.isStatic ? "@theme static" : "@theme"];

          // Start with existing declarations to preserve positions
          const declarations: Array<{ type: "declaration"; property: string; value: string }> = [
            ...(rule.declarations || []),
          ];

          // First, update/add special properties
          if (theme.isInitial) {
            addOrUpdateDeclaration(declarations, SPECIAL_PROPERTIES.INITIAL_MARKER, "initial");
          } else {
            // Remove isInitial property if it's disabled
            addOrUpdateDeclaration(declarations, SPECIAL_PROPERTIES.INITIAL_MARKER, "");
          }

          if (theme.spacing) {
            addOrUpdateDeclaration(
              declarations,
              SPECIAL_PROPERTIES.SPACING_MULTIPLIER,
              theme.spacing,
            );
          } else {
            // Remove spacing property if it's empty
            addOrUpdateDeclaration(declarations, SPECIAL_PROPERTIES.SPACING_MULTIPLIER, "");
          }

          // Update/add all current namespace declarations (preserves existing positions)
          serializeNamespaces(theme, declarations);

          // Collect all current theme properties for comparison
          const currentThemeProperties = new Set<string>();

          // Add special properties if they exist
          if (theme.isInitial) {
            currentThemeProperties.add(SPECIAL_PROPERTIES.INITIAL_MARKER);
          }
          if (theme.spacing) {
            currentThemeProperties.add(SPECIAL_PROPERTIES.SPACING_MULTIPLIER);
          }

          // Add all namespace properties from current theme
          Object.entries(theme.namespaces).forEach(([namespace, values]) => {
            if (values && Object.keys(values).length > 0) {
              const properties = flattenNestedObject(values, namespace);
              properties.forEach(({ property }) => {
                currentThemeProperties.add(property);
              });
            }
          });

          // Remove leftover namespace declarations that are no longer in the theme
          const filteredDeclarations = declarations.filter((decl: any) => {
            // Skip declarations with empty, null, or undefined values
            if (decl.type === "declaration" && (!decl.value || decl.value.trim() === "")) {
              return false;
            }

            if (decl.type !== "declaration" || !decl.property.startsWith("--")) {
              return true; // Keep non-CSS-custom-property declarations
            }

            // Check if this is a namespace property
            const match = decl.property.match(/^--([^-]+)-/);
            if (match) {
              const namespace = match[1];
              // If it's a known namespace property, only keep if it's in current theme
              if (namespace in THEME_NAMESPACES) {
                return currentThemeProperties.has(decl.property);
              }
            }

            // Keep special properties if they're in current theme, or unknown namespace properties
            return currentThemeProperties.has(decl.property) || !match;
          });

          // Update the rule's declarations
          rule.declarations = filteredDeclarations;
          break;
        }
      }
    }
  }

  return cssToolsStringify(ast);
}

/**
 * Creates a new AST from theme data
 * @param theme - The theme object
 * @returns CSS string
 */
function createNewAST(theme: WizardTheme): string {
  const declarations: Array<{ type: "declaration"; property: string; value: string }> = [];

  // Add special properties
  if (theme.isInitial) {
    declarations.push({
      type: "declaration",
      property: SPECIAL_PROPERTIES.INITIAL_MARKER,
      value: "initial",
    });
  }

  if (theme.spacing) {
    declarations.push({
      type: "declaration",
      property: SPECIAL_PROPERTIES.SPACING_MULTIPLIER,
      value: theme.spacing,
    });
  }

  // Serialize all namespaces
  serializeNamespaces(theme, declarations);

  // Filter out any declarations with empty values
  const filteredDeclarations = declarations.filter(
    (decl) => decl.value && decl.value.trim() !== "",
  );

  // Determine the @theme selector based on flags
  const themeSelector = theme.isStatic ? "@theme static" : "@theme";

  // Create the AST structure compatible with css-tools
  const ast: any = {
    type: "stylesheet",
    stylesheet: {
      rules: [
        {
          type: "rule",
          selectors: [themeSelector],
          declarations: filteredDeclarations,
        },
      ],
    },
  };

  return cssToolsStringify(ast);
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Composable function that provides wizard theme utilities
 * @returns Object with theme manipulation functions
 */
export function useWizard() {
  return {
    getDefaultTheme,
    parseWizardFile,
    stringifyTheme,
  };
}
