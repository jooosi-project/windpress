import { ToolbarButton, Dropdown, MenuGroup, MenuItem } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useDarkMode } from "../../hooks/useDarkMode";

function DarkModeToggle() {
  const { theme, applyTheme, cycleTheme } = useDarkMode();

  const getIcon = () => {
    if (theme === "light") {
      return <IconLucideSun width={24} height={24} aria-hidden="true" />;
    }

    if (theme === "dark") {
      return <IconLucideMoon width={24} height={24} aria-hidden="true" />;
    }

    return <IconLucideMonitorCog width={24} height={24} aria-hidden="true" />;
  };

  const getLabel = () => {
    if (theme === "light") {
      return __("Theme: Light", "windpress");
    } else if (theme === "dark") {
      return __("Theme: Dark", "windpress");
    } else {
      return __("Theme: System", "windpress");
    }
  };

  return (
    <Dropdown
      popoverProps={{ placement: "bottom-start" }}
      renderToggle={({ isOpen, onToggle }) => (
        <ToolbarButton
          icon={getIcon()}
          label={getLabel()}
          onClick={cycleTheme}
          onContextMenu={(e) => {
            e.preventDefault();
            onToggle();
          }}
          aria-expanded={isOpen}
        />
      )}
      renderContent={() => (
        <MenuGroup label={__("Theme", "windpress")}>
          <MenuItem
            icon={<IconLucideSun width={20} height={20} aria-hidden="true" />}
            isSelected={theme === "light"}
            onClick={() => applyTheme("light")}
          >
            {__("Light", "windpress")}
          </MenuItem>
          <MenuItem
            icon={<IconLucideMoon width={20} height={20} aria-hidden="true" />}
            isSelected={theme === "dark"}
            onClick={() => applyTheme("dark")}
          >
            {__("Dark", "windpress")}
          </MenuItem>
          <MenuItem
            icon={<IconLucideMonitorCog width={20} height={20} aria-hidden="true" />}
            isSelected={theme === "system"}
            onClick={() => applyTheme("system")}
          >
            {__("System", "windpress")}
          </MenuItem>
        </MenuGroup>
      )}
    />
  );
}

export default DarkModeToggle;
