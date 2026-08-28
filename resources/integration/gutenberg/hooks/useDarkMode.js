/**
 * @module hooks/useDarkMode
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Shared dark mode hook for Gutenberg integration
 */

import { useState, useEffect, useRef } from "@wordpress/element";

const EDITOR_CANVAS_SELECTOR = [
  '.editor-visual-editor iframe[name="editor-canvas"]',
  "iframe.edit-site-visual-editor__editor-canvas",
  'iframe[name="editor-canvas"]',
].join(", ");

function normalizeTheme(theme) {
  return ["light", "dark", "system"].includes(theme) ? theme : "system";
}

function getEditorCanvas() {
  return document.querySelector(EDITOR_CANVAS_SELECTOR);
}

function getStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem("windpress-theme") || "system");
  } catch (e) {
    return "system";
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem("windpress-theme", theme);
  } catch (e) {
    // Silent fail
  }
}

function applyThemeToDocument(targetDocument, newTheme) {
  if (!targetDocument || !targetDocument.documentElement) {
    return false;
  }

  const target = targetDocument.documentElement;

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
    target.style.colorScheme = prefersDark ? "dark" : "light";
    target.setAttribute("data-theme", prefersDark ? "dark" : "light");

    if (prefersDark) {
      target.classList.add("dark");
    }
  }

  return true;
}

/**
 * Custom hook for managing dark mode in Gutenberg editor
 * @returns {Object} Dark mode state and controls
 */
export function useDarkMode() {
  const [theme, setTheme] = useState("system");
  const themeRef = useRef("system");

  const applyTheme = (newTheme) => {
    const nextTheme = normalizeTheme(newTheme);

    themeRef.current = nextTheme;
    storeTheme(nextTheme);
    setTheme(nextTheme);

    const iframe = getEditorCanvas();
    applyThemeToDocument(iframe?.contentDocument, nextTheme);

    // Dispatch custom event to notify other components
    window.dispatchEvent(
      new CustomEvent("windpress-theme-change", { detail: { theme: nextTheme } }),
    );
  };

  useEffect(() => {
    const savedTheme = getStoredTheme();
    themeRef.current = savedTheme;
    setTheme(savedTheme);

    let iframe = null;
    let retryTimeout = null;

    function handleIframeLoad() {
      applyThemeToDocument(iframe?.contentDocument, themeRef.current);
    }

    function syncIframe() {
      const nextIframe = getEditorCanvas();

      if (nextIframe !== iframe) {
        if (iframe) {
          iframe.removeEventListener("load", handleIframeLoad);
        }

        iframe = nextIframe;

        if (iframe) {
          iframe.addEventListener("load", handleIframeLoad);
        }
      }

      applyThemeToDocument(iframe?.contentDocument, themeRef.current);
    }

    function applyWithRetry(attempts = 0) {
      syncIframe();

      if ((!iframe || !iframe.contentDocument) && attempts < 20) {
        retryTimeout = setTimeout(() => applyWithRetry(attempts + 1), 200);
      }
    }

    applyWithRetry();

    const iframeObserver = new MutationObserver(() => {
      const currentIframe = getEditorCanvas();
      if (currentIframe !== iframe) {
        syncIframe();
      }
    });

    if (document.body) {
      iframeObserver.observe(document.body, { childList: true, subtree: true });
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (themeRef.current === "system") {
        const currentIframe = getEditorCanvas();
        applyThemeToDocument(currentIframe?.contentDocument, "system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    // Listen for theme changes from other components
    const handleThemeChange = (event) => {
      const nextTheme = normalizeTheme(event.detail?.theme);
      themeRef.current = nextTheme;
      setTheme(nextTheme);
      const currentIframe = getEditorCanvas();
      applyThemeToDocument(currentIframe?.contentDocument, nextTheme);
    };

    window.addEventListener("windpress-theme-change", handleThemeChange);

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      iframeObserver.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener("windpress-theme-change", handleThemeChange);
      if (iframe) {
        iframe.removeEventListener("load", handleIframeLoad);
      }
    };
  }, []);

  const cycleTheme = () => {
    if (themeRef.current === "light") {
      applyTheme("dark");
    } else if (themeRef.current === "dark") {
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
