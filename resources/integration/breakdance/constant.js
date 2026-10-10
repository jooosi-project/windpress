const bde = document.querySelector("#app");
const bdeIframe = bde?.querySelector("#iframe") ?? null;
const bdeIframeCanvas =
  bdeIframe?.contentDocument?.querySelector("#breakdance_canvas") ?? null;
const bdeStores = window.Breakdance?.stores;
const bdeDocumentStore = bdeStores?.documentStore;
const bdeUiStore = bdeStores?.uiStore;
const bdeStore =
  bde?.__vue__?.$store ??
  bde?.__vue_app__?.config?.globalProperties?.$store ??
  null;

export { bde, bdeDocumentStore, bdeIframe, bdeIframeCanvas, bdeStore, bdeUiStore };
