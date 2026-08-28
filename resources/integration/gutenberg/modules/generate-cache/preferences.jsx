/**
 * @module generate-cache/preferences
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Register preferences for generate-cache module
 */

import { __ } from "@wordpress/i18n";
import { PluginMoreMenuItem } from "@wordpress/edit-post";
import { useDispatch, useSelect } from "@wordpress/data";
import { store as preferencesStore } from "@wordpress/preferences";
import { ToggleControl } from "@wordpress/components";
import { registerPlugin } from "@wordpress/plugins";

const PREFERENCE_NAME = "windpressGenerateCacheOnSave";
const SCOPE = "windpress/gutenberg";

/**
 * Component to add preference toggle in Preferences modal
 */
function WindPressPreferences() {
  const { set } = useDispatch(preferencesStore);

  const isEnabled = useSelect((select) => {
    return select(preferencesStore).get(SCOPE, PREFERENCE_NAME) ?? true;
  }, []);

  const handleToggle = (value) => {
    set(SCOPE, PREFERENCE_NAME, value);
  };

  return (
    <ToggleControl
      label={__("Generate cache on save", "windpress")}
      help={__("Automatically regenerate Tailwind CSS cache when saving posts", "windpress")}
      checked={isEnabled}
      onChange={handleToggle}
    />
  );
}

/**
 * Get current preference value
 */
export function isGenerateCacheOnSaveEnabled() {
  const { get } = wp.data.select(preferencesStore);
  return get(SCOPE, PREFERENCE_NAME) ?? true;
}

/**
 * Register the preferences section
 */
export function registerGenerateCachePreferences() {
  // Register the plugin to add preferences
  wp.hooks.addFilter("editor.BlockEdit", "windpress/generate-cache-preferences", (BlockEdit) => {
    return (props) => {
      // This is just a hook point, actual UI is in Preferences modal
      return <BlockEdit {...props} />;
    };
  });

  // Add preferences using the built-in WordPress preferences system
  wp.data.dispatch(preferencesStore).setDefaults(SCOPE, {
    [PREFERENCE_NAME]: true,
  });
}
