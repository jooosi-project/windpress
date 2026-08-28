const oxyBody = document.body;
const oxygenScope = angular.element(document.body).scope();
const iframeScope = oxygenScope.iframeScope;
const oxyIframe = document.querySelector("#ct-artificial-viewport");

export { oxyBody, oxygenScope, iframeScope, oxyIframe };

window.oxygenScope = oxygenScope;
