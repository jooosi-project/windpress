// =============================================================================
// Types & Interfaces
// =============================================================================

interface TailwindVariable {
  key: string;
  value: string | null;
  index: number;
}

interface ColorPalette {
  name: string;
  slug: string;
  color: string;
}

interface FontFamily {
  name: string;
  slug: string;
  fontFamily: string;
}

interface FontSize {
  name: string;
  slug: string;
  size: string;
}

interface BorderRadius {
  name: string;
  slug: string;
  size: string;
}

interface Shadow {
  name: string;
  slug: string;
  shadow: string;
}

interface SpacingSize {
  name: string;
  slug: string;
  size: string;
}

interface ThemeJsonSettings {
  color: {
    palette: ColorPalette[];
  };
  typography: {
    fontSizes: FontSize[];
    fontFamilies: FontFamily[];
  };
  border: {
    radiusSizes: BorderRadius[];
  };
  shadow: {
    presets: Shadow[];
  };
  spacing: {
    spacingSizes: SpacingSize[];
  };
}

interface ThemeJson {
  $schema: string;
  version: number;
  settings: ThemeJsonSettings;
}

// =============================================================================
// Constants
// =============================================================================

const THEME_JSON_TEMPLATE: Omit<ThemeJson, "settings"> & {
  settings: {
    color: {};
    typography: {};
    border: {};
    shadow: {};
    spacing: {};
  };
} = {
  $schema: "https://schemas.wp.org/trunk/theme.json",
  version: 3,
  settings: {
    color: {},
    typography: {},
    border: {},
    shadow: {},
    spacing: {},
  },
};

const CSS_VARIABLE_PATTERNS = {
  COLOR: "--color-",
  FONT_FAMILY: "--font-",
  FONT_SIZE: "--text-",
  BORDER_RADIUS: "--radius-",
  SHADOW: "--shadow-",
  INSET_SHADOW: "--inset-shadow-",
  DROP_SHADOW: "--drop-shadow-",
  SPACING: "--spacing-",
} as const;

const INVALID_FONT_FAMILY_PROPS = [
  "feature-settings",
  "variation-settings",
  "family",
  "size",
  "smoothing",
  "style",
  "weight",
  "stretch",
] as const;

const INVALID_FONT_SIZE_PROPS = ["line-height", "letter-spacing", "font-weight", "shadow"] as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format variable name for human-readable display
 */
function formatVariableName(name: string): string {
  return `[tw] ` + name.replace(/[-_]/g, " ").trim();
}

/**
 * Create a sanitized slug from a variable name
 */
function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

/**
 * Check if a variable name contains any invalid properties
 */
function isValidProperty(name: string, invalidProps: readonly string[]): boolean {
  return !invalidProps.some((prop) => name.includes(prop));
}

/**
 * Sort font sizes by numeric value for proper ordering
 */
function sortFontSizes(fontSizes: FontSize[]): FontSize[] {
  return fontSizes.sort((a, b) => {
    const aValue = parseFloat(a.size);
    const bValue = parseFloat(b.size);
    return aValue - bValue;
  });
}

// =============================================================================
// Processing Functions
// =============================================================================

/**
 * Process color variables
 */
function processColorVariable(key: string, value: string): ColorPalette {
  const colorName = key.replace(CSS_VARIABLE_PATTERNS.COLOR, "");
  return {
    name: formatVariableName(colorName),
    slug: createSlug(colorName),
    color: value.trim(),
  };
}

/**
 * Process font family variables
 */
function processFontFamilyVariable(key: string, value: string): FontFamily | null {
  const fontName = key.replace(CSS_VARIABLE_PATTERNS.FONT_FAMILY, "");

  if (!isValidProperty(fontName, INVALID_FONT_FAMILY_PROPS)) {
    return null;
  }

  return {
    name: formatVariableName(fontName),
    slug: createSlug(fontName),
    fontFamily: value.trim().replace(/['"]/g, ""),
  };
}

/**
 * Process font size variables
 */
function processFontSizeVariable(key: string, value: string): FontSize | null {
  const sizeName = key.replace(CSS_VARIABLE_PATTERNS.FONT_SIZE, "");

  if (!isValidProperty(sizeName, INVALID_FONT_SIZE_PROPS)) {
    return null;
  }

  return {
    name: formatVariableName(sizeName),
    slug: createSlug(sizeName),
    size: value.trim(),
  };
}

/**
 * Process border radius variables
 */
function processBorderRadiusVariable(key: string, value: string): BorderRadius {
  const radiusName = key.replace(CSS_VARIABLE_PATTERNS.BORDER_RADIUS, "");
  return {
    name: formatVariableName(radiusName),
    slug: createSlug(radiusName),
    size: value.trim(),
  };
}

/**
 * Process shadow variables (handles --shadow-, --inset-shadow-, --drop-shadow-)
 */
function processShadowVariable(key: string, value: string): Shadow {
  let shadowName: string;
  let shadowType = "";

  if (key.startsWith(CSS_VARIABLE_PATTERNS.INSET_SHADOW)) {
    shadowName = key.replace(CSS_VARIABLE_PATTERNS.INSET_SHADOW, "");
    shadowType = "inset-";
  } else if (key.startsWith(CSS_VARIABLE_PATTERNS.DROP_SHADOW)) {
    shadowName = key.replace(CSS_VARIABLE_PATTERNS.DROP_SHADOW, "");
    shadowType = "drop-";
  } else {
    shadowName = key.replace(CSS_VARIABLE_PATTERNS.SHADOW, "");
  }

  return {
    name: formatVariableName(`${shadowType}${shadowName}`),
    slug: createSlug(`${shadowType}${shadowName}`),
    shadow: value.trim(),
  };
}

/**
 * Process spacing variables
 */
function processSpacingVariable(key: string, value: string): SpacingSize {
  const spacingName = key.replace(CSS_VARIABLE_PATTERNS.SPACING, "");
  return {
    name: formatVariableName(spacingName),
    slug: createSlug(spacingName),
    size: value.trim(),
  };
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Convert Tailwind CSS variables to WordPress theme.json format
 */
function twToWp(variables: TailwindVariable[]): ThemeJson {
  const themeJson: ThemeJson = {
    ...THEME_JSON_TEMPLATE,
    settings: {
      color: {
        palette: [],
      },
      typography: {
        fontSizes: [],
        fontFamilies: [],
      },
      border: {
        radiusSizes: [],
      },
      shadow: {
        presets: [],
      },
      spacing: {
        spacingSizes: [],
      },
    },
  };

  variables.forEach(({ key, value }) => {
    if (!value) return;

    // Process colors
    if (key.startsWith(CSS_VARIABLE_PATTERNS.COLOR)) {
      const colorEntry = processColorVariable(key, value);
      themeJson.settings.color.palette.push(colorEntry);
    }
    // Process font families
    else if (key.startsWith(CSS_VARIABLE_PATTERNS.FONT_FAMILY)) {
      const fontFamilyEntry = processFontFamilyVariable(key, value);
      if (fontFamilyEntry) {
        themeJson.settings.typography.fontFamilies.push(fontFamilyEntry);
      }
    }
    // Process font sizes
    else if (key.startsWith(CSS_VARIABLE_PATTERNS.FONT_SIZE)) {
      const fontSizeEntry = processFontSizeVariable(key, value);
      if (fontSizeEntry) {
        themeJson.settings.typography.fontSizes.push(fontSizeEntry);
      }
    }
    // Process border radius
    else if (key.startsWith(CSS_VARIABLE_PATTERNS.BORDER_RADIUS)) {
      const radiusEntry = processBorderRadiusVariable(key, value);
      themeJson.settings.border.radiusSizes.push(radiusEntry);
    }
    // Process shadows (check inset and drop shadows first due to prefix overlap)
    else if (
      key.startsWith(CSS_VARIABLE_PATTERNS.INSET_SHADOW) ||
      key.startsWith(CSS_VARIABLE_PATTERNS.DROP_SHADOW) ||
      key.startsWith(CSS_VARIABLE_PATTERNS.SHADOW)
    ) {
      const shadowEntry = processShadowVariable(key, value);
      themeJson.settings.shadow.presets.push(shadowEntry);
    }
    // Process spacing
    else if (key.startsWith(CSS_VARIABLE_PATTERNS.SPACING)) {
      const spacingEntry = processSpacingVariable(key, value);
      themeJson.settings.spacing.spacingSizes.push(spacingEntry);
    }
  });

  // Sort font sizes for proper ordering
  themeJson.settings.typography.fontSizes = sortFontSizes(themeJson.settings.typography.fontSizes);

  return themeJson;
}

// =============================================================================
// Exports
// =============================================================================

export { twToWp };
export type {
  TailwindVariable,
  ThemeJson,
  ColorPalette,
  FontFamily,
  FontSize,
  BorderRadius,
  Shadow,
  SpacingSize,
};
