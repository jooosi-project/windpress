import * as csstree from "css-tree";
import { nanoid } from "nanoid";
import { debounce } from "lodash-es";
import "./iframe-style.css";

/**
 * Isolate CSS from affecting Common Blocks by adding :not() selectors
 * @param {string} css - CSS string to isolate
 * @returns {string} Modified CSS with isolation selectors
 */
function isolateFromCommonBlocks(css) {
  const ast = csstree.parse(css);

  csstree.walk(ast, {
    enter: (node) => {
      // Skip keyframes - they don't need isolation
      if (node.type === "Atrule" && node.name === "keyframes") {
        return csstree.walk.skip;
      }

      if (node.type === "SelectorList") {
        node.children.forEach((selector) => {
          const selectorText = csstree.generate(selector);

          // Skip selectors already targeting common blocks
          if (selectorText.includes("windpress-common-block")) {
            return;
          }

          // Skip complex pseudo-selectors that can't be chained
          const hasComplexPseudo = selector.children.some(
            (child) =>
              child.type === "PseudoClassSelector" &&
              ![
                "visible",
                "hover",
                "focus",
                "focus-visible",
                "focus-within",
                "target",
                "read-write",
                "active",
                "visited",
                "link",
                "disabled",
                "checked",
                "first-child",
                "last-child",
                "nth-child",
                "where",
                "is",
                "not",
                "has",
              ].includes(child.name),
          );

          if (hasComplexPseudo) {
            return;
          }

          // Add :not(.windpress-common-block)
          selector.children.push({
            type: "PseudoClassSelector",
            name: "not",
            children: [
              {
                type: "ClassSelector",
                name: "windpress-common-block",
              },
            ],
          });

          // Add :not(.windpress-common-block *)
          selector.children.push({
            type: "PseudoClassSelector",
            name: "not",
            children: [
              {
                type: "ClassSelector",
                name: "windpress-common-block",
              },
              {
                type: "Combinator",
                name: " ",
              },
              {
                type: "TypeSelector",
                name: "*",
              },
            ],
          });
        });
      }
    },
  });

  return csstree.generate(ast);
}

/**
 * Check if an element should be excluded from processing
 * @param {HTMLElement} el - Element to check
 * @returns {boolean} True if should be excluded
 */
function shouldExcludeElement(el) {
  const id = el.id || "";
  const href = el.href || "";

  // Skip already isolated (by attribute)
  if (el.hasAttribute("data-wp-is-isolated")) return true;

  // Skip WindPress and Common Block styles
  if (id.includes("windpress") || id.includes("common-block")) return true;
  if (href.includes("windpress") || href.includes("common-block")) return true;

  // Skip by content for inline styles
  if (el instanceof HTMLStyleElement && el.textContent) {
    const content = el.textContent;
    if (
      content.includes("windpress-common-block") ||
      content.includes("cb-text-node") ||
      content.includes("https://tailwindcss.com") ||
      content.includes("block-list-appender")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Get unique identifier for an element, generating one if needed
 * @param {HTMLElement} el - Element to identify
 * @returns {string|null} Unique identifier
 */
function getElementIdentifier(el) {
  let identifier = el.id || el.href;

  // Generate nanoid for inline styles without IDs
  if (!identifier && el instanceof HTMLStyleElement) {
    if (!el.dataset.windpressId) {
      el.dataset.windpressId = `inline-${nanoid(10)}`;
    }
    identifier = el.dataset.windpressId;
  }

  return identifier;
}

/**
 * Process a link element (fetch CSS and isolate)
 * @param {HTMLLinkElement} element - Link element to process
 * @param {string} identifier - Element identifier
 * @returns {Promise} Promise resolving to replacement data or null
 */
function processLinkElement(element, identifier, isolateFromCommonBlocks) {
  return fetch(element.href)
    .then((res) => res.text())
    .then((css) => {
      if (!element.parentNode) return null;

      try {
        const modifiedCss = isolateFromCommonBlocks(css);
        const style = document.createElement("style");
        style.setAttribute("data-wp-is-isolated", "true");
        style.textContent = modifiedCss;

        return {
          element,
          newStyle: style,
          success: true,
        };
      } catch (err) {
        window.windpressIsolatedElements.delete(identifier);
        return null;
      }
    })
    .catch((err) => {
      window.windpressIsolatedElements.delete(identifier);
      return null;
    });
}

/**
 * Process an inline style element
 * @param {HTMLStyleElement} element - Style element to process
 * @param {string} identifier - Element identifier
 * @returns {Object|null} Replacement data or null
 */
function processStyleElement(element, identifier, isolateFromCommonBlocks) {
  if (element.hasAttribute("data-wp-is-isolated")) {
    return null;
  }

  // Check cache first
  if (window.windpressStyleCache && window.windpressStyleCache.has(element)) {
    return window.windpressStyleCache.get(element);
  }

  try {
    const originalContent = element.textContent;
    const modifiedCss = isolateFromCommonBlocks(originalContent);

    const style = document.createElement("style");
    style.setAttribute("data-wp-is-isolated", "true");
    style.textContent = modifiedCss;

    const result = {
      element,
      newStyle: style,
      isInline: true,
      success: true,
    };

    // Cache the result
    if (window.windpressStyleCache) {
      window.windpressStyleCache.set(element, result);
    }

    return result;
  } catch (err) {
    window.windpressIsolatedElements.delete(identifier);
    return null;
  }
}

/**
 * Apply all style replacements atomically
 * @param {Array} replacements - Array of replacement objects
 */
function applyReplacements(replacements) {
  if (replacements.length === 0) return;

  // Step 1: Insert all new styles first
  replacements.forEach(({ element, newStyle }) => {
    if (element.parentNode) {
      element.parentNode.insertBefore(newStyle, element);
    }
  });

  // Step 2: Wait for styles to be applied, then clean up
  requestAnimationFrame(() => {
    replacements.forEach(({ element, newStyle, isInline }) => {
      if (isInline) {
        // For inline styles, update original element with modified content
        element.textContent = newStyle.textContent;
        element.setAttribute("data-wp-is-isolated", "true");
        newStyle.remove();
      } else {
        // For link elements, remove original (new style stays)
        element.remove();
      }
    });
  });
}

/**
 * Process Gutenberg styles to isolate them from Common Blocks
 */
function processGutenbergStylesInIframe() {
  const { isolateFromCommonBlocks } = window.windpressCommonBlockIsolation;

  // Initialize tracking set and cache
  if (!window.windpressIsolatedElements) {
    window.windpressIsolatedElements = new Set();
  }

  // Initialize WeakMap cache for processed styles
  if (!window.windpressStyleCache) {
    window.windpressStyleCache = new WeakMap();
  }

  // Get all styles and links, excluding ones we want to keep
  const allElements = document.querySelectorAll('style, link[rel="stylesheet"]');
  const elementsToProcess = Array.from(allElements).filter((el) => !shouldExcludeElement(el));

  // Filter to unprocessed elements only
  const unprocessedElements = elementsToProcess.filter((el) => {
    const identifier = getElementIdentifier(el);

    if (!identifier) return false;
    if (window.windpressIsolatedElements.has(identifier)) return false;
    if (identifier.includes("windpress") || identifier.includes("common-block")) return false;

    return true;
  });

  if (unprocessedElements.length === 0) {
    return;
  }

  // Batch all replacements - don't remove originals until ALL are ready
  const replacements = [];
  const fetchPromises = [];

  unprocessedElements.forEach((element) => {
    const identifier = getElementIdentifier(element);
    window.windpressIsolatedElements.add(identifier);

    if (element instanceof HTMLLinkElement) {
      const promise = processLinkElement(element, identifier, isolateFromCommonBlocks);
      fetchPromises.push(promise);
    } else if (element instanceof HTMLStyleElement) {
      const replacement = processStyleElement(element, identifier, isolateFromCommonBlocks);
      if (replacement) {
        replacements.push(replacement);
      }
    }
  });

  // Wait for all fetches to complete, then apply all replacements at once
  if (fetchPromises.length > 0) {
    Promise.all(fetchPromises).then((results) => {
      results.forEach((result) => {
        if (result && result.success) {
          replacements.push(result);
        }
      });
      applyReplacements(replacements);
    });
  } else {
    // No fetches needed, apply inline replacements immediately
    applyReplacements(replacements);
  }
}

/**
 * Initialize style isolation
 * Works for both iframed and non-iframed editors
 */
function initializeStyleIsolation() {
  // Store dependencies in window for backward compatibility
  window.windpressCommonBlockIsolation = {
    csstree,
    isolateFromCommonBlocks,
  };

  // Initial processing
  setTimeout(() => {
    processGutenbergStylesInIframe();
  }, 500);

  // Setup debounced observer for new styles with longer delay for better performance
  // Increased from 150ms to 500ms to reduce processing frequency
  const debouncedProcess = debounce(processGutenbergStylesInIframe, 500);

  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        // Only process actual style/link elements
        if (!(node instanceof HTMLLinkElement || node instanceof HTMLStyleElement)) {
          return;
        }

        // Skip already isolated elements
        if (node.hasAttribute("data-wp-is-isolated")) {
          return;
        }

        // Skip excluded elements
        if (shouldExcludeElement(node)) {
          return;
        }

        // Check if already in cache
        if (window.windpressStyleCache && window.windpressStyleCache.has(node)) {
          return;
        }

        shouldProcess = true;
      });
    });

    if (shouldProcess) {
      debouncedProcess();
    }
  });

  observer.observe(document.head, {
    childList: true,
    subtree: true,
  });
}

/**
 * Main initialization function
 * This script is loaded into iframe by post-editor.js
 */
(async () => {
  // Check if we're in an iframe (editor-canvas)
  const isInIframe = window.self !== window.top;
  const isEditorCanvas = isInIframe && window.name === "editor-canvas";

  if (!isEditorCanvas) {
    return;
  }

  // In iframe, we don't need to wait for editor-visual-editor
  // That element exists in the parent window, not in the iframe
  // The iframe content is ready when this script runs
  initializeStyleIsolation();
})();

export { isolateFromCommonBlocks, processGutenbergStylesInIframe };
