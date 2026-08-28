import "./style.scss";
import { logger } from "@/integration/common/logger";

logger("Loading...");

(async () => {
  console.log("Waiting for Vue app to be ready...");
  while (!document.querySelector("#app")?.__vue_app__) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  while (
    !document.querySelector("#app #iframe")?.contentDocument.querySelector("#breakdance_canvas")
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const { bdeIframe } = await import("./constant");

  logger("Loading modules...");

  // TODO: dynamic import the features based on the enabled modules
  await import("./modules/plain-classes/main");
  // await import('./modules/html2breakdance/main');
  await import("./modules/generate-cache/main");
  await import("./modules/settings/main");

  // tailwindcss-v4
  if (Number(bdeIframe.contentWindow.windpress?._tailwindcss_version) === 4) {
    await import("./modules/variables/main");
    await import("./modules/variable-picker/main");
  }

  logger("Modules loaded!");
})();
