/**
 * https://github.com/imguolao/monaco-vue#vite
 * https://github.com/vitejs/vite/issues/13680#issuecomment-1819274694
 */
import { loader } from "@guolao/vue-monaco-editor";
import "monaco-editor/esm/vs/basic-languages/css/css.contribution";
import "monaco-editor/esm/vs/language/css/monaco.contribution.js";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution.js";
import * as monaco from "monaco-editor/esm/vs/editor/edcore.main.js";
import editorWorkerUrl from "monaco-editor/esm/vs/editor/editor.worker?worker&url";
import cssWorkerUrl from "monaco-editor/esm/vs/language/css/css.worker?worker&url";
import jsWorkerUrl from "monaco-editor/esm/vs/language/typescript/ts.worker?worker&url";
import { WorkaroundWorker } from "@/packages/core/windpress/utils";

self.MonacoEnvironment = {
  async getWorker(_, label) {
    if (label === "css" || label === "scss" || label === "less") {
      return WorkaroundWorker(cssWorkerUrl) as Worker;
    } else if (label === "javascript" || label === "typescript") {
      return WorkaroundWorker(jsWorkerUrl) as Worker;
    }
    return WorkaroundWorker(editorWorkerUrl) as Worker;
  },
};

loader.config({ monaco });
