import "./style.scss";

import { createApp, ref, watch } from "vue";
import { logger } from "@/integration/common/logger";
import InlineSvg from "vue-inline-svg";
import FloatingVue from "floating-vue";
import App from "./App.vue";
import { observe } from "./utility.js";
import { bde } from "@/integration/breakdance/constant.js";

const variableApp = document.createElement("windpressbreakdance-variable-app");
variableApp.id = "windpressbreakdance-variable-app";
bde.appendChild(variableApp);

const isOpen = ref(false);
const focusedInput = ref(null);
const tempInputValue = ref(null);
const recentVariableSelectionTimestamp = ref(0);

const app = createApp(App);

app.config.globalProperties.windpressbreakdance = window.windpressbreakdance;

app.provide("variableApp", variableApp);
app.provide("isOpen", isOpen);
app.provide("focusedInput", focusedInput);
app.provide("tempInputValue", tempInputValue);
app.provide("recentVariableSelectionTimestamp", recentVariableSelectionTimestamp);

app.use(FloatingVue, {
  container: "#windpressbreakdance-variable-app",
});

app.component("InlineSvg", InlineSvg);

app.mount("#windpressbreakdance-variable-app");

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

const breakdanceInputs = {
  includedFields: [
    "div.breakdance-control-wrapper-input-wrapper div.breakdance-text-input-wrapper",
  ],
  excludedFields: [],
};

function addTriggers() {
  setTimeout(() => {
    let shouldReset = false;

    breakdanceInputs.includedFields.forEach((field) => {
      const wrappers =
        typeof field === "string"
          ? [...document.querySelectorAll(field)]
          : [...document.querySelectorAll(field.selector)].filter((n) =>
              field.hasChild.some((c) => n.querySelector(c)),
            );
      wrappers.forEach((wrapper) => {
        const input = wrapper.querySelector("input[type='text']");
        if (input?.getAttribute("windpressbreakdance-variable-app") === "listened") {
          return;
        }

        input?.removeEventListener("click", onInputClick);
        input?.addEventListener("click", onInputClick);
        input?.removeEventListener("focus", onFocusCallback);
        input?.addEventListener("focus", onFocusCallback);

        input?.setAttribute("windpressbreakdance-variable-app", "listened");

        shouldReset = true;
      });
    });

    if (shouldReset) {
      focusedInput.value = null;
      tempInputValue.value = null;
    }
  }, 100);
}

let isObserverRunning = false;
observe({
  selector: "div:has(>div.breakdance-add-panel)",
  options: {
    subtree: true,
    childList: true,
  },
  callback() {
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
