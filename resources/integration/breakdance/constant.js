const bde = document.querySelector("#app");
const bdeV = bde.__vue__;
const bdeIframe = document.querySelector("#app #iframe");
const bdeIframeCanvas = bdeIframe?.contentDocument.querySelector("#breakdance_canvas");
const bdeIframeV = bdeIframeCanvas.__vue__;

export { bde, bdeV, bdeIframe, bdeIframeCanvas, bdeIframeV };
