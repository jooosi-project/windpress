/**
 * @module variables
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Register the design system variables to the :root of the editor document
 */

import { getVariableList, decodeVFSContainer, loadDesignSystem } from "@/packages/core/tailwindcss";
import { logger } from "@/integration/common/logger";
import { previewIframe } from "@/integration/livecanvas/constant.js";

let varStylesheet: HTMLStyleElement | undefined;

async function registerVariables() {
  if (!varStylesheet) {
    varStylesheet = document.createElement("style");
    document.head.appendChild(varStylesheet);
  }

  const vfsContainer = previewIframe.contentWindow.document.querySelector(
    'script#windpress\\:vfs[type="text/plain"]',
  );
  const volume = decodeVFSContainer(vfsContainer.textContent);

  // register variables to :root
  const variableLists = await getVariableList(await loadDesignSystem({ volume }));
  let css = ":root {\n";
  variableLists.forEach((variable) => {
    css += `  ${variable.key}: ${variable.value};\n`;
  });
  css += "}\n";

  varStylesheet.textContent = css;
}

const channel = new BroadcastChannel("windpress");
channel.addEventListener("message", async (e) => {
  const data = e.data;
  const source = "windpress/intellisense";
  const target = "any";
  const task = "windpress.code-editor.saved.done";

  if (data.source === source && data.task === task) {
    setTimeout(() => {
      registerVariables();
    }, 1000);
  }
});

registerVariables();

logger("Module loaded!", { module: "variables" });
