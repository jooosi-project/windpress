const bde = document.querySelector("#app");
const bdeV = bde.__vue_app__;
const bdeIframe = document.querySelector("#app #iframe");
const bdeIframeCanvas = bdeIframe?.contentDocument.querySelector("#breakdance_canvas");
const bdeIframeV = bdeIframeCanvas.__vue_app__;
const bdeStores = window.Breakdance?.stores;
const bdeConfigStore = bdeStores?.configStore;
const bdeDocumentStore = bdeStores?.documentStore;
const bdeGlobalStore = bdeStores?.globalStore;
const bdeUiStore = bdeStores?.uiStore;

export {
  bde,
  bdeV,
  bdeIframe,
  bdeIframeCanvas,
  bdeIframeV,
  bdeConfigStore,
  bdeDocumentStore,
  bdeGlobalStore,
  bdeUiStore,
};
