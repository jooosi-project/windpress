import "./styles/main.css";

import "./wp-admin";

import { createApp } from "vue";
import { createPinia, PiniaPluginContext } from "pinia";
import ui from "@nuxt/ui/vue-plugin";
import { install as VueMonacoEditorPlugin } from "@guolao/vue-monaco-editor";

import App from "./App.vue";
import router from "./router";

import i18nPlugin from "./plugins/i18n";

import { setupWorker } from "@/packages/core/windpress/worker";

async function bootstrap() {
  await import("./monaco-editor"); // Load Monaco contributions before editor components mount

  const app = createApp(App);
  const pinia = createPinia();

  app.config.globalProperties.window = window;

  // Pinia plugin: Initialize the store with the data from the server.
  pinia.use(({ store }: PiniaPluginContext) => {
    if (["volume", "settings"].includes(store.$id)) {
      store.initPull();
    }
  });

  app.use(router).use(ui).use(pinia).use(VueMonacoEditorPlugin).use(i18nPlugin);

  app.mount("#windpress-app");

  setupWorker();
}

void bootstrap();
