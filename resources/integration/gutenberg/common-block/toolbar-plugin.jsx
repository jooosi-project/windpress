import { registerPlugin } from "@wordpress/plugins";
import { __ } from "@wordpress/i18n";
import { ToolbarGroup } from "@wordpress/components";
import HtmlImportButton from "./components/HtmlImportButton";
import DarkModeToggle from "./components/DarkModeToggle";

/**
 * HTML Import Toolbar Plugin
 * Adds an HTML import button to the editor toolbar
 */
function HtmlImportToolbarPlugin() {
  return null; // We'll inject the button via a different method
}

/**
 * Register the HTML Import plugin
 */
registerPlugin("windpress-html-import", {
  render: HtmlImportToolbarPlugin,
});

/**
 * Add the HTML Import button to the toolbar using DOM manipulation
 * This ensures it appears in the main toolbar
 */
if (typeof window !== "undefined") {
  // Wait for WordPress to be ready
  wp.domReady(() => {
    const { render, createElement } = wp.element;

    let toolbarContainer = null;
    let hasRendered = false;

    // Function to add the buttons to the toolbar
    const addButtonToToolbar = () => {
      const toolbar = document.querySelector(
        ".edit-post-header-toolbar, .editor-document-tools__left",
      );

      if (!toolbar) return;

      // Create a container if it doesn't exist
      if (!toolbarContainer) {
        toolbarContainer = document.createElement("div");
        toolbarContainer.id = "windpress-toolbar-buttons";
        toolbarContainer.style.cssText = "display: inline-flex; align-items: center;";
        toolbar.appendChild(toolbarContainer);
      }

      // Render the React components into the container
      if (!hasRendered) {
        render(
          createElement(
            "div",
            { style: { display: "flex" } },
            createElement(HtmlImportButton),
            createElement(DarkModeToggle),
          ),
          toolbarContainer,
        );
        hasRendered = true;
      }
    };

    // Try to add button immediately
    addButtonToToolbar();

    // Watch for toolbar changes using wp.data.subscribe
    wp.data.subscribe(() => {
      addButtonToToolbar();
    });
  });
}
