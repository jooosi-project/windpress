import { logger } from "@/integration/common/logger";

logger("Loading...");

(async () => {
  while (!document.querySelector(".brx-body")?.__vue_app__) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  while (document.getElementById("bricks-preloader")) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  while (
    !document.getElementById("bricks-builder-iframe")?.contentDocument.querySelector(".brx-body")
      ?.__vue_app__
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const { brxIframe } = await import("./constant");

  logger("Loading modules...");

  // TODO: dynamic import the features based on the enabled modules
  await import("./modules/settings/main");

  if (window.bricksData.version.startsWith("1")) {
    await import("./modules/plain-classes/main-1.x");
  } else {
    await import("./modules/plain-classes/main");
  }

  await import("./modules/html2bricks/main");
  await import("./modules/generate-cache/main");

  // tailwindcss-v4
  if (Number(brxIframe.contentWindow.windpress?._tailwindcss_version) === 4) {
    await import("./modules/color-palette/main");
    await import("./modules/variables/main");
    await import("./modules/variable-picker/main");
  }

  logger("Modules loaded!");
})();
