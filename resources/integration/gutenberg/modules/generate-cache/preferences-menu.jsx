/**
 * @module generate-cache/preferences-menu
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Add WindPress preferences to Gutenberg editor settings sidebar
 */

import { __ } from "@wordpress/i18n";
import { useDispatch, useSelect } from "@wordpress/data";
import { store as preferencesStore } from "@wordpress/preferences";
import { ToggleControl, PanelBody, PanelRow, Button } from "@wordpress/components";
import { PluginSidebar, PluginSidebarMoreMenuItem } from "@wordpress/editor";
import { registerPlugin } from "@wordpress/plugins";
import { useDarkMode } from "../../hooks/useDarkMode";

const PREFERENCE_NAME = "windpressGenerateCacheOnSave";
const SCOPE = "windpress/gutenberg";

/**
 * WindPress Settings Sidebar
 */
function WindPressSettingsSidebar() {
  const { set } = useDispatch(preferencesStore);

  const isEnabled = useSelect((select) => {
    return select(preferencesStore).get(SCOPE, PREFERENCE_NAME) ?? true;
  }, []);

  const handleToggle = (value) => {
    set(SCOPE, PREFERENCE_NAME, value);
  };

  const { theme, applyTheme } = useDarkMode();

  return (
    <>
      <PluginSidebarMoreMenuItem
        target="windpress-settings"
        icon={<IconWindpressWindpress width={20} height={20} aria-hidden="true" focusable="false" />}
      >
        {__("WindPress", "windpress")}
      </PluginSidebarMoreMenuItem>
      <PluginSidebar
        name="windpress-settings"
        title={__("WindPress Settings", "windpress")}
        icon={<IconWindpressWindpress width={20} height={20} aria-hidden="true" focusable="false" />}
      >
        <PanelBody title={__("Appearance", "windpress")} initialOpen={true}>
          <PanelRow>
            <div style={{ width: "100%" }}>
              <div
                style={{
                  marginBottom: "8px",
                  fontSize: "11px",
                  fontWeight: "500",
                  textTransform: "uppercase",
                  color: "#1e1e1e",
                }}
              >
                {__("Theme", "windpress")}
              </div>
              <div style={{ display: "flex", width: "100%", gap: 0 }}>
                <Button
                  icon={<IconLucideSun width={16} height={16} aria-hidden="true" />}
                  variant="secondary"
                  onClick={() => applyTheme("light")}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    gap: "4px",
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    marginRight: "-1px",
                    backgroundColor: theme === "light" ? "var(--wp-admin-theme-color)" : undefined,
                    color: theme === "light" ? "#fff" : undefined,
                    borderColor: theme === "light" ? "var(--wp-admin-theme-color)" : undefined,
                  }}
                >
                  {__("Light", "windpress")}
                </Button>
                <Button
                  icon={<IconLucideMoon width={16} height={16} aria-hidden="true" />}
                  variant="secondary"
                  onClick={() => applyTheme("dark")}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    gap: "4px",
                    borderRadius: 0,
                    marginRight: "-1px",
                    backgroundColor: theme === "dark" ? "var(--wp-admin-theme-color)" : undefined,
                    color: theme === "dark" ? "#fff" : undefined,
                    borderColor: theme === "dark" ? "var(--wp-admin-theme-color)" : undefined,
                  }}
                >
                  {__("Dark", "windpress")}
                </Button>
                <Button
                  icon={<IconLucideMonitorCog width={16} height={16} aria-hidden="true" />}
                  variant="secondary"
                  onClick={() => applyTheme("system")}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    gap: "4px",
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    backgroundColor: theme === "system" ? "var(--wp-admin-theme-color)" : undefined,
                    color: theme === "system" ? "#fff" : undefined,
                    borderColor: theme === "system" ? "var(--wp-admin-theme-color)" : undefined,
                  }}
                >
                  {__("System", "windpress")}
                </Button>
              </div>
            </div>
          </PanelRow>
        </PanelBody>
        <PanelBody title={__("Cache Generation", "windpress")} initialOpen={true}>
          <PanelRow>
            <ToggleControl
              label={__("Generate cache on save", "windpress")}
              help={__(
                "Automatically regenerate Tailwind CSS cache when saving posts. This ensures your Tailwind classes are compiled immediately after saving.",
                "windpress",
              )}
              checked={isEnabled}
              onChange={handleToggle}
            />
          </PanelRow>
        </PanelBody>
      </PluginSidebar>
    </>
  );
}

/**
 * Register the WindPress settings plugin
 */
export function registerWindPressSettingsSidebar() {
  registerPlugin("windpress-settings", {
    render: WindPressSettingsSidebar,
    icon: <IconWindpressWindpress width={20} height={20} aria-hidden="true" focusable="false" />,
  });
}
