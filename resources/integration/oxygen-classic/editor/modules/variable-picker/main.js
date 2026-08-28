import "./style.scss";

import { createApp, ref, watch } from "vue";
import { logger } from "@/integration/common/logger";
import InlineSvg from "vue-inline-svg";
import FloatingVue from "floating-vue";
import App from "./App.vue";
import { observe } from "./utility.js";

const variableApp = document.createElement("windpressoxygen-variable-app");
variableApp.id = "windpressoxygen-variable-app";
document.body.appendChild(variableApp);

const isOpen = ref(false);
const focusedInput = ref(null);
const tempInputValue = ref(null);
const recentVariableSelectionTimestamp = ref(0);

const app = createApp(App);

app.config.globalProperties.windpressoxygen = window.windpressoxygen;

app.provide("variableApp", variableApp);
app.provide("isOpen", isOpen);
app.provide("focusedInput", focusedInput);
app.provide("tempInputValue", tempInputValue);
app.provide("recentVariableSelectionTimestamp", recentVariableSelectionTimestamp);

app.use(FloatingVue, {
  container: "#windpressoxygen-variable-app",
});

app.component("InlineSvg", InlineSvg);

app.mount("#windpressoxygen-variable-app");

function onInputClick(e) {
  if (!e.shiftKey || !e.target) {
    return;
  }

  document?.getSelection()?.removeAllRanges();
  e.preventDefault();
  e.stopPropagation();
  focusedInput.value = e.target;
  tempInputValue.value = e.target.value;
  isOpen.value = true;
}

function onFocusCallback(e) {
  focusedInput.value = e.target;
}

const excludedNgModels = [
  "iframeScope.component.options[iframeScope.component.active.id]['model']['background-image']",
  "iframeScope.component.options[iframeScope.component.active.id]['model']['icon-size']",
  "iframeScope.fontsFilter",
  "postsFilter",
  "currentlyEditingFilter",
  "iframeScope.iconFilter.title",
  "iframeScope.component.options[iframeScope.component.active.id]['model']['z-index']",
  "iframeScope.component.options[iframeScope.component.active.id]['model']['src']",
  "iframeScope.component.options[iframeScope.component.active.id]['model']['rel']",
  "iframeScope.component.options[iframeScope.component.active.id]['model']['url']",
  "iframeScope.component.options[iframeScope.component.active.id]['model']['testimonial_photo']",
  "iframeScope.component.options[iframeScope.component.active.id]['model']['pricing_box_price",
];
const excludedNgModelsWithWildcard = [
  "iframeScope.component.options[iframeScope.component.active.id]['model']['title-*']",
  "iframeScope.component.options[iframeScope.component.active.id]['model']['icon-*']",
  "duration",
  "url",
  "speed",
  "time",
  "address",
  "zoom",
].map((s) => s.replace("*']", ""));
const oxyInputs = `.oxygen-control input[type="text"]:not(.ct-iris-colorpicker):not([ng-model*="shortcode"])${excludedNgModels.map((s) => `:not([ng-model="${s}"])`).join("")}${excludedNgModelsWithWildcard.map((s) => `:not([ng-model*="${s}"])`).join("")}`;

function addTriggers() {
  setTimeout(() => {
    let shouldReset = false;

    const inputs = [...document.querySelectorAll(oxyInputs)];

    inputs.forEach((input) => {
      if (input?.getAttribute("windpressoxygen-variable-app") === "listened") {
        return;
      }

      input?.removeEventListener("click", onInputClick);
      input?.addEventListener("click", onInputClick);
      input?.removeEventListener("focus", onFocusCallback);
      input?.addEventListener("focus", onFocusCallback);

      input?.setAttribute("windpressoxygen-variable-app", "listened");

      shouldReset = true;
    });

    if (shouldReset) {
      focusedInput.value = null;
      tempInputValue.value = null;
    }
  }, 100);
}

let isObserverRunning = false;
observe({
  selector: "#oxygen-sidebar",
  options: {
    subtree: true,
    childList: true,
  },
  callback(_) {
    if (isObserverRunning) {
      return;
    }
    isObserverRunning = true;
    addTriggers();
    setTimeout(() => {
      isObserverRunning = false;
    }, 100);
  },
});

addTriggers();

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isOpen.value) {
    isOpen.value = false;
  }
});

watch(isOpen, (value) => {
  variableApp.style.zIndex = value ? "calc(Infinity)" : "-1";
});

logger("Module loaded!", { module: "variable-picker" });
