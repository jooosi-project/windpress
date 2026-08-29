/**
 * https://github.com/imguolao/monaco-vue#vite
 * https://github.com/vitejs/vite/issues/13680#issuecomment-1819274694
 */
import { loader } from "@guolao/vue-monaco-editor";
import * as monaco from "monaco-editor";
import editorWorkerUrl from "monaco-editor/editor/editor.worker?worker&url";
import cssWorkerUrl from "monaco-editor/language/css/css.worker?worker&url";
import jsWorkerUrl from "monaco-editor/language/typescript/ts.worker?worker&url";
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
