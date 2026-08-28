/**
 * @module variables
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Register the variables entry to the Breakdance editor.
 */

import { bdeIframe } from "@/integration/breakdance/constant.js";
import { getVariableList, decodeVFSContainer, loadDesignSystem } from "@/packages/core/tailwindcss";
import { logger } from "@/integration/common/logger";

async function mountVariablesStylesheet() {
  const vfsContainer = bdeIframe.contentWindow.document.querySelector(
    'script#windpress\\:vfs[type="text/plain"]',
  );
  const volume = decodeVFSContainer(vfsContainer.textContent);

  // register variables
  const variableLists = await getVariableList(await loadDesignSystem({ volume }));

  let css = "";
  variableLists.forEach((variable) => {
    css += `--${variable.key.substring(2)}: ${variable.value};\n`;
  });

  css = `@layer base { :root { ${css} } }`;

  // top window
  let topStyle;

  if (document.head.querySelector("style#windpress-variables")) {
    topStyle = document.head.querySelector("style#windpress-variables");
  } else {
    topStyle = document.createElement("style");
    topStyle.id = "windpress-variables";
    document.head.appendChild(topStyle);
  }
  if (topStyle) {
    topStyle.textContent = css;
  }

  // iframe window
  let iframeStyle;
  if (bdeIframe.contentWindow.document.head.querySelector("style#windpress-variables")) {
    iframeStyle = bdeIframe.contentWindow.document.head.querySelector("style#windpress-variables");
  } else {
    iframeStyle = bdeIframe.contentWindow.document.createElement("style");
    iframeStyle.id = "windpress-variables";
    bdeIframe.contentWindow.document.head.appendChild(iframeStyle);
  }
  if (iframeStyle) {
    iframeStyle.textContent = css;
  }
}

const channel = new BroadcastChannel("windpress");
channel.addEventListener("message", async (e) => {
  const data = e.data;
  const source = "windpress/intellisense";
  const target = "any";
  const task = "windpress.code-editor.saved.done";

  if (data.source === source && data.task === task) {
    setTimeout(() => {
      mountVariablesStylesheet();
    }, 1000);
  }
});

mountVariablesStylesheet();

logger("Module loaded!", { module: "variables" });
