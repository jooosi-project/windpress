/**
 * @module hooks/useDarkMode
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Shared dark mode hook for Gutenberg integration
 */

import { useState, useEffect } from "@wordpress/element";

/**
 * Custom hook for managing dark mode in Gutenberg editor
 * @returns {Object} Dark mode state and controls
 */
export function useDarkMode() {
  const [theme, setTheme] = useState("system");

  const applyTheme = (newTheme) => {
    const iframe = document.querySelector('iframe[name="editor-canvas"]');

    if (!iframe || !iframe.contentDocument) {
      return;
    }

    const target = iframe.contentDocument.documentElement;

    target.classList.remove("dark", "light");
    target.style.removeProperty("color-scheme");
    target.removeAttribute("data-theme");

    if (newTheme === "light") {
      target.classList.add("light");
      target.style.colorScheme = "light";
      target.setAttribute("data-theme", "light");
    } else if (newTheme === "dark") {
      target.classList.add("dark");
      target.style.colorScheme = "dark";
      target.setAttribute("data-theme", "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        target.classList.add("dark");
        target.setAttribute("data-theme", "dark");
      }
    }

    try {
      localStorage.setItem("windpress-theme", newTheme);
    } catch (e) {
      // Silent fail
    }

    setTheme(newTheme);

    // Dispatch custom event to notify other components
    window.dispatchEvent(
      new CustomEvent("windpress-theme-change", { detail: { theme: newTheme } }),
    );
  };

  useEffect(() => {
    let savedTheme = "system";
    try {
      savedTheme = localStorage.getItem("windpress-theme") || "system";
    } catch (e) {
      // Silent fail
    }

    setTheme(savedTheme);

    const applyWithRetry = (attempts = 0) => {
      const iframe = document.querySelector('iframe[name="editor-canvas"]');

      if (iframe && iframe.contentDocument) {
        applyTheme(savedTheme);
      } else if (attempts < 20) {
        setTimeout(() => applyWithRetry(attempts + 1), 200);
      }
    };

    applyWithRetry();

    const handleIframeLoad = () => {
      applyTheme(savedTheme);
    };

    const iframe = document.querySelector('iframe[name="editor-canvas"]');
    if (iframe) {
      iframe.addEventListener("load", handleIframeLoad);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const currentTheme = localStorage.getItem("windpress-theme") || "system";
      if (currentTheme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    // Listen for theme changes from other components
    const handleThemeChange = (event) => {
      setTheme(event.detail.theme);
    };

    window.addEventListener("windpress-theme-change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener("windpress-theme-change", handleThemeChange);
      if (iframe) {
        iframe.removeEventListener("load", handleIframeLoad);
      }
    };
  }, []);

  const cycleTheme = () => {
    if (theme === "light") {
      applyTheme("dark");
    } else if (theme === "dark") {
      applyTheme("system");
    } else {
      applyTheme("light");
    }
  };

  return {
    theme,
    applyTheme,
    cycleTheme,
  };
}
