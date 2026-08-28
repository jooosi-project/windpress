import { logger } from "@/integration/common/logger";

logger("Loading...");

(async () => {
  while (!document.getElementById("previewiframe")?.contentDocument.querySelector("#lc-main")) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger("Loading modules...");

  // TODO: dynamic import the features based on the enabled modules
  // await import('./modules/settings/main');
  await import("./modules/variables/main");
  await import("./modules/autocomplete/main");
  await import("./modules/generate-cache/main");
  await import("./modules/htmleditor/main");
  await import("./modules/plain-classes/main");

  logger("Modules loaded!");
})();
