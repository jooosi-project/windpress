import { logger } from "@/integration/common/logger";

logger("Loading...");

(async () => {
  while (
    angular.element(window.top.document.body).scope() === void 0 ||
    angular.element(window.top.document.body).scope().iframeScope === false
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const { oxyIframe } = await import("./constant");

  logger("Loading modules...");

  // TODO: dynamic import the features based on the enabled modules
  await import("./modules/settings/main");
  await import("./modules/plain-classes/main");
  await import("./modules/generate-cache/main");

  // tailwindcss-v4
  if (Number(oxyIframe.contentWindow.windpress?._tailwindcss_version) === 4) {
    await import("./modules/variables/main");
    await import("./modules/variable-picker/main");
  }

  logger("Modules loaded!");
})();
