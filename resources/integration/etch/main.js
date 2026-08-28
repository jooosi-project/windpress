import { logger } from "@/integration/common/logger";

logger("Loading...");

(async () => {
  while (!document.getElementById("etch-iframe")?.contentDocument?.querySelector("body")) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger("Loading modules...");

  await import("./modules/play/observer");

  // TODO: Autcomplete
  // document.querySelector('.etch-html-editor .cm-editor .cm-content').cmView

  // TODO: merge with other module (refactor)
  await import("./modules/intellisense/classname-to-css");
  await import("./modules/intellisense/element-attribute-panel");
})();
