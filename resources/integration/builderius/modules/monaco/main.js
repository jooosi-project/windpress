/**
 * @module monaco
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Register monaco autocompletion
 */

import { logger } from "@/integration/common/logger";
import { uniIframe } from "@/integration/builderius/constant.js";
import { getVariableList, decodeVFSContainer, loadDesignSystem } from "@/packages/core/tailwindcss";

function naturalExpand(value, total = null) {
  const length = typeof total === "number" ? total.toString().length : 8;
  return ("0".repeat(length) + value).slice(-length);
}

(async function () {
  const vfsContainer = uniIframe.contentWindow.document.querySelector(
    'script#windpress\\:vfs[type="text/plain"]',
  );
  const volume = decodeVFSContainer(vfsContainer.textContent);

  window.Builderius.API.monaco.languages.registerCompletionItemProvider("builderius-css", {
    async provideCompletionItems(model, position) {
      const wordInfo = model.getWordUntilPosition(position);

      // register variables
      const variables = getVariableList(await loadDesignSystem({ volume })).map((entry) => {
        return {
          kind: entry.key.includes("--color")
            ? window.Builderius.API.monaco.languages.CompletionItemKind.Color
            : window.Builderius.API.monaco.languages.CompletionItemKind.Variable,
          label: entry.key,
          insertText: entry.key,
          detail: entry.value,
          range: {
            startLineNumber: position.lineNumber,
            startColumn: wordInfo.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: wordInfo.endColumn,
          },
          sortText: naturalExpand(entry.index),
        };
      });

      return {
        suggestions: variables,
      };
    },
  });
})();

const channel = new BroadcastChannel("windpress");

channel.addEventListener("message", async (e) => {
  const data = e.data;
  const source = "windpress/intellisense";
  const target = "any";
  const task = "windpress.code-editor.saved.done";

  if (data.source === source && data.task === task) {
    setTimeout(() => {}, 1000);
  }
});

logger("Module loaded!", { module: "generate-cache" });
