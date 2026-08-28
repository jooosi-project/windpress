import { logger } from "@/integration/common/logger";
import { debounce } from "lodash-es";

logger("Loading...");

(async () => {
  let rootContainer;
  let scriptElements;

  logger("waiting for the rootContainer...");

  // wait for the root container to be available
  while (!rootContainer) {
    rootContainer = document.querySelector("div#site-editor");
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

  async function injectIntoEditorCanvas() {
    let patternIframes = [];

    let timeoutOccurred = false;
    let timeout = setTimeout(() => {
      timeoutOccurred = true;
    }, 45000); // 45 seconds timeout

    // wait for the editor canvas to be available
    while (!timeoutOccurred) {
      let editorCanvas = document.querySelector("iframe.edit-site-visual-editor__editor-canvas");
      patternIframes = [
        ...document.querySelectorAll(
          "div.block-editor-block-preview__container > div > div > div.block-editor-iframe__scale-container > iframe",
        ),
      ];

      if (editorCanvas) {
        patternIframes.push(editorCanvas);
      }

      if (patternIframes.length > 0) {
        clearTimeout(timeout);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (timeoutOccurred) {
      logger("time out! failed to find editor canvas");
      return;
    }

    logger("found editor canvas");

    logger("waiting for the canvas loader to be removed...");

    while (document.querySelector("div.edit-site-canvas-loader") !== null) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    logger("canvas loader removed");

    patternIframes.forEach(async (patternIframe) => {
      let contentWindow = patternIframe.contentWindow || patternIframe;
      let contentDocument = patternIframe.contentDocument || contentWindow.document;

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
    });
  }

  const injectIntoEditorCanvasDebounced = debounce(injectIntoEditorCanvas, 1000);

  // Set up a mutation observer to react to changes in the site editor
  new MutationObserver(() => {
    injectIntoEditorCanvasDebounced();
  }).observe(rootContainer, {
    subtree: true,
    childList: true,
  });
})();
