import { logger } from "@/integration/common/logger";

logger("Loading...");

(async () => {
  let editorVisualEditor;
  let iframeEl;
  let scriptElements;

  // wait for the editor-visual-editor
  logger("waiting for the editor-visual-editor...");

  let tryCount = 0;
  const maxTries = 300; // 30 seconds max wait time
  while (!editorVisualEditor && tryCount < maxTries) {
    editorVisualEditor = document.querySelector("div.editor-visual-editor");
    tryCount++;
    if (tryCount >= maxTries) {
      logger("time out! failed to find editor-visual-editor");
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!editorVisualEditor) {
    logger("editor-visual-editor not found, skipping the injection process...");
    return;
  }

  // if the editor-visual-editor is not iframed, we can start the observer immediately
  if (!editorVisualEditor.classList.contains("is-iframed")) {
    logger("editor-visual-editor is not iframed, starting the observer immediately...");
    if (window.twPlayObserverStart) {
      window.twPlayObserverStart();
    }

    return;
  }

  logger("waiting for the iframeEl...");

  // wait for the root container to be available
  while (!iframeEl) {
    iframeEl = document.querySelector('iframe[name="editor-canvas"]');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger("finding WindPress script...");

  // Timeout flag and timer to limit the search duration
  let timeoutOccurred = false;
  let timeout = setTimeout(() => {
    timeoutOccurred = true;
  }, 45000); // 45 seconds timeout

  // wait for the script to be available
  while (!timeoutOccurred) {
    scriptElements = document.querySelectorAll("script");

    // filter the script elements. Search for the script with the id prefixed with 'windpress:' except 'windpress:integration-'
    scriptElements = Array.from(scriptElements).filter((scriptElement) => {
      let id = scriptElement.getAttribute("id");
      return (
        id &&
        (id.startsWith("windpress:") || id.startsWith("vite-client")) &&
        !id.startsWith("windpress:integration-")
      );
    });

    if (scriptElements.length > 0) {
      clearTimeout(timeout);
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (timeoutOccurred) {
    logger("time out! failed to find WindPress script");
    return;
  }

  logger("found WindPress script");

  let contentWindow = iframeEl.contentWindow || iframeEl;
  let contentDocument = iframeEl.contentDocument || contentWindow.document;

  // wait until contentDocument.head is available
  while (!contentDocument.head) {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Inject the script into the root iframe
  logger("injecting WindPress script into the root container");

  let injectedScript = contentDocument.querySelectorAll("script");

  // check if the script is already injected if it has any script's id that starts with 'windpress:'
  let isScriptInjected = Array.from(injectedScript).some((script) => {
    let id = script.getAttribute("id");
    return id && id.startsWith("windpress:");
  });

  if (!isScriptInjected) {
    logger("starting the root injection process...");
    scriptElements.forEach((scriptElement) => {
      contentDocument.head.appendChild(
        document.createRange().createContextualFragment(scriptElement.outerHTML),
      );
    });
  } else {
    logger("WindPress script is already injected, skipping the injection process...");
  }

  let modalPatterPreviewOverlay = null;

  // observe if 'body > div.components-modal__screen-overlay' is added or removed
  const patterPreviewOverlayObserver = new MutationObserver(async (mutationsList) => {
    let needInject = false;
    let patternIframes = [];
    let waitingTry = 2000;

    for (const mutation of mutationsList) {
      if (needInject) {
        break;
      }

      if (mutation.type === "childList") {
        mutation.removedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.matches("div.components-modal__screen-overlay")
          ) {
            modalPatterPreviewOverlay = null;
          }
        });

        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.matches("body > div.components-modal__screen-overlay")
          ) {
            modalPatterPreviewOverlay = node;
            needInject = true;
          }
        });
      }
    }

    if (needInject) {
      // Check if this is actually a pattern preview modal by looking for the pattern preview container
      const hasPatternPreview = modalPatterPreviewOverlay.querySelector(
        "div.block-editor-block-preview__container",
      );

      if (!hasPatternPreview) {
        // Not a pattern preview modal, skip injection
        return;
      }

      logger("waiting for the patternIframes...");

      // wait for the patternIframes greater than 0
      while (patternIframes.length === 0 && waitingTry > 0) {
        patternIframes = modalPatterPreviewOverlay.querySelectorAll(
          "div.block-editor-block-preview__container > div > div > div.block-editor-iframe__scale-container > iframe",
        );
        waitingTry -= 100;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (waitingTry <= 0 && patternIframes.length === 0) {
        logger("time out! failed to find the patternIframes");
        return;
      }

      patternIframes.forEach((patternIframe) => {
        let patternIframeDocument =
          patternIframe.contentDocument || patternIframe.contentWindow.document;

        let patternIframeHead = patternIframeDocument.head;
        // check if the script is already injected if it has any script's id that starts with 'windpress:'
        let isPatternIframeScriptInjected = Array.from(
          patternIframeHead.querySelectorAll("script"),
        ).some((script) => {
          let id = script.getAttribute("id");
          return id && id.startsWith("windpress:");
        });
        if (!isPatternIframeScriptInjected) {
          logger("injecting WindPress script into the pattern iframe");
          scriptElements.forEach((scriptElement) => {
            patternIframeHead.appendChild(
              document.createRange().createContextualFragment(scriptElement.outerHTML),
            );
          });
        } else {
          logger(
            "WindPress script is already injected into the pattern iframe, skipping the injection process...",
          );
        }
      });

      patternIframes = [];
    }
  });

  patterPreviewOverlayObserver.observe(document.body, {
    childList: true,
    subtree: false,
  });

  let sidebarPatterPreviewPanel = null;

  // block-editor-inserter__block-patterns-tabs-container
  const patternPreviewSidebarObserver = new MutationObserver(async (mutationsList) => {
    let needInject = false;
    let patternIframes = [];
    let waitingTry = 20000;

    for (const mutation of mutationsList) {
      if (needInject) {
        break;
      }

      if (mutation.type === "childList") {
        mutation.removedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.matches("div.block-editor-inserter__category-panel")
          ) {
            sidebarPatterPreviewPanel = null;
          }
        });

        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.matches("div.block-editor-inserter__category-panel")
          ) {
            sidebarPatterPreviewPanel = node;
            needInject = true;
          }
        });
      }
    }

    if (needInject) {
      // Check if this panel actually has pattern preview containers
      const hasPatternPreview = sidebarPatterPreviewPanel.querySelector(
        "div.block-editor-block-preview__container",
      );

      if (!hasPatternPreview) {
        // Not a pattern preview panel, skip injection
        return;
      }

      logger("waiting for the patternIframes...");

      // wait for the patternIframes greater than 0
      while (patternIframes.length === 0 && waitingTry > 0) {
        patternIframes = sidebarPatterPreviewPanel.querySelectorAll(
          "div.block-editor-block-preview__container > div > div > div.block-editor-iframe__scale-container > iframe",
        );
        waitingTry -= 100;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (waitingTry <= 0 && patternIframes.length === 0) {
        logger("time out! failed to find the patternIframes");
        return;
      }

      patternIframes.forEach((patternIframe) => {
        let patternIframeDocument =
          patternIframe.contentDocument || patternIframe.contentWindow.document;

        let patternIframeHead = patternIframeDocument.head;
        // check if the script is already injected if it has any script's id that starts with 'windpress:'
        let isPatternIframeScriptInjected = Array.from(
          patternIframeHead.querySelectorAll("script"),
        ).some((script) => {
          let id = script.getAttribute("id");
          return id && id.startsWith("windpress:");
        });
        if (!isPatternIframeScriptInjected) {
          logger("injecting WindPress script into the pattern iframe");
          scriptElements.forEach((scriptElement) => {
            patternIframeHead.appendChild(
              document.createRange().createContextualFragment(scriptElement.outerHTML),
            );
          });
        } else {
          logger(
            "WindPress script is already injected into the pattern iframe, skipping the injection process...",
          );
        }
      });

      patternIframes = [];
    }
  });

  patternPreviewSidebarObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
