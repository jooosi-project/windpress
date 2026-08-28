/**
 * @module generate-cache/preferences-panel
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Add WindPress preferences panel to Gutenberg Preferences modal
 */

import { __ } from "@wordpress/i18n";
import { store as preferencesStore } from "@wordpress/preferences";
import { registerWindPressSettingsSidebar } from "./preferences-menu.jsx";

const PREFERENCE_NAME = "windpressGenerateCacheOnSave";
const SCOPE = "windpress/gutenberg";

/**
 * Register WindPress preferences in Gutenberg
 */
export function registerWindPressPreferences() {
  // Set default preferences
  wp.data.dispatch(preferencesStore).setDefaults(SCOPE, {
    [PREFERENCE_NAME]: true,
  });

  // Register the settings sidebar
  registerWindPressSettingsSidebar();
}

/**
 * Get current preference value
 */
export function isGenerateCacheOnSaveEnabled() {
  try {
    const { get } = wp.data.select(preferencesStore);
    return get(SCOPE, PREFERENCE_NAME) ?? true;
  } catch (e) {
    return true; // Default to enabled if preferences store not ready
  }
}

/**
 * Initialize preferences
 */
export function initializePreferences() {
  registerWindPressPreferences();
}
