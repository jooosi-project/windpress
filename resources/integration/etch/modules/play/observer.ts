import { logger } from "@/integration/common/logger";
import { etchIframe } from "@/integration/etch/constant.js";

async function registerPlayObserver() {
  const iframeEl = etchIframe();
  let scriptElements: NodeListOf<HTMLScriptElement> | HTMLScriptElement[] = [];

  logger("finding WindPress script...", { module: "play/observer" });

  // Timeout flag and timer to limit the search duration
  let timeoutOccurred = false;
  const timeout = setTimeout(() => {
    timeoutOccurred = true;
  }, 45000); // 45 seconds timeout

  // wait for the script to be available
  while (!timeoutOccurred) {
    scriptElements = document.querySelectorAll("script");

    // filter the script elements. Search for the script with the id prefixed with 'windpress:' except 'windpress:integration-'
    scriptElements = Array.from(scriptElements).filter((scriptElement) => {
      const id = scriptElement.getAttribute("id");
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
    logger("time out! failed to find WindPress script", { module: "play/observer" });
    return;
  }

  logger("found WindPress script", { module: "play/observer" });

  const contentWindow = iframeEl.contentWindow || iframeEl;
  const contentDocument = iframeEl.contentDocument || contentWindow.document;

  // wait until contentDocument.head is available
  while (!contentDocument.head) {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Inject the script into the root iframe
  logger("injecting WindPress script into the root container", { module: "play/observer" });

  const injectedScript = contentDocument.querySelectorAll("script");

  // check if the script is already injected if it has any script's id that starts with 'windpress:'
  const isScriptInjected = Array.from(injectedScript).some((script) => {
    const id = (script as HTMLScriptElement).getAttribute("id");
    return id && id.startsWith("windpress:");
  });

  if (!isScriptInjected) {
    logger("starting the root injection process...", { module: "play/observer" });
    (scriptElements as HTMLScriptElement[]).forEach((scriptElement) => {
      // if the script id is 'windpress:metadata' or 'windpress:metadata', put it in the head, else put it in the body
      const id = scriptElement.getAttribute("id");
      if (id && (id.startsWith("windpress:metadata") || id.startsWith("vite-client"))) {
        contentDocument.head.appendChild(
          document.createRange().createContextualFragment(scriptElement.outerHTML),
        );
      } else {
        contentDocument.body.appendChild(
          document.createRange().createContextualFragment(scriptElement.outerHTML),
        );
      }
    });
    logger("WindPress script injected successfully", { module: "play/observer" });
  } else {
    logger("WindPress script is already injected, skipping the injection process...", {
      module: "play/observer",
    });
  }

  iframeEl.dataset.windpressInjected = "true";
}

const observer = new MutationObserver(() => {
  const target: HTMLElement | null = etchIframe();

  if (target && !target.dataset.windpressInjected) {
    setTimeout(() => {
      if (target.dataset.windpressInjected) {
        return; // Already injected
      }

      registerPlayObserver();
    }, 100); // Delay to ensure the iframe is fully loaded
  }
});

observer.observe(document, {
  subtree: true,
  childList: true,
});

logger("Play: observer.ts module loaded");
