import "./style.scss";

import { createApp, nextTick, ref, watch } from "vue";
import { logger } from "@/integration/common/logger";
import InlineSvg from "vue-inline-svg";
import FloatingVue from "floating-vue";
import App from "./App.vue";
import { observe } from "./utility.js";

const variableApp = document.createElement("windpressbricks-variable-app");
variableApp.id = "windpressbricks-variable-app";
document.body.appendChild(variableApp);

const isOpen = ref(false);
const focusedInput = ref(null);
const tempInputValue = ref(null);
const recentColorPickerTarget = ref(null);
const recentVariableSelectionTimestamp = ref(0);

const app = createApp(App);

app.config.globalProperties.windpressbricks = window.windpressbricks;

app.provide("variableApp", variableApp);
app.provide("isOpen", isOpen);
app.provide("focusedInput", focusedInput);
app.provide("tempInputValue", tempInputValue);
app.provide("recentColorPickerTarget", recentColorPickerTarget);
app.provide("recentVariableSelectionTimestamp", recentVariableSelectionTimestamp);

app.use(FloatingVue, {
  container: "#windpressbricks-variable-app",
});

app.component("InlineSvg", InlineSvg);

app.mount("#windpressbricks-variable-app");

function getEventElement(target) {
  if (target instanceof Element) {
    return target;
  }

  return target?.parentElement ?? null;
}

function openForInput(e, input) {
  if (!e.shiftKey || !input) {
    return;
  }

  document?.getSelection()?.removeAllRanges();
  e.preventDefault();
  e.stopPropagation();
  focusedInput.value = input;
  tempInputValue.value = input.value;
  isOpen.value = true;
}

function openForColor(e, target) {
  if (!e.shiftKey || !target) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  document?.getSelection()?.removeAllRanges();
  focusedInput.value = null;
  isOpen.value = true;

  recentColorPickerTarget.value = null; // ensure the watcher is triggered
  nextTick(() => {
    recentColorPickerTarget.value = target;
  });
}

function onFocusCallback(e) {
  focusedInput.value = e.target;
}

const bricksInputs = [
  'div[data-control="number"]',
  {
    selector: 'div[data-control="text"]',
    hasChild: [
      "#_flexBasis",
      "#_overflow",
      "#_gridTemplateColumns",
      "#_gridTemplateRows",
      "#_gridAutoColumns",
      "#_gridAutoRows",
      "#_objectPosition",
      '[id^="raw-"]',
    ],
  },
];

function isInsideBricksPanel(element) {
  return Boolean(element?.closest("#bricks-panel-inner, .bricks-control-popup"));
}

function isSupportedInput(input) {
  if (!isInsideBricksPanel(input)) {
    return false;
  }

  const wrapper = input.closest('[data-control="number"], [data-control="text"]');
  const control = wrapper?.getAttribute("data-control");

  if (control === "number") {
    return true;
  }

  if (control === "text") {
    const textField = bricksInputs.find((field) => typeof field !== "string");

    return textField.hasChild.some((selector) => wrapper.querySelector(selector) === input);
  }

  return false;
}

function getColorTrigger(element) {
  if (!isInsideBricksPanel(element)) {
    return null;
  }

  const trigger = element?.closest(".bricks-control-preview");
  return trigger?.closest('[data-control="color"]') ? trigger : null;
}

function onDocumentClick(e) {
  if (!e.shiftKey || !e.target) {
    return;
  }

  const element = getEventElement(e.target);
  const input = element?.closest('input[type="text"]');
  if (input && isSupportedInput(input)) {
    openForInput(e, input);
    return;
  }

  const colorTrigger = getColorTrigger(element);
  if (colorTrigger) {
    openForColor(e, colorTrigger);
  }
}

function onDocumentContextMenu(e) {
  if (!e.shiftKey || !e.target) {
    return;
  }

  const colorTrigger = getColorTrigger(getEventElement(e.target));
  if (colorTrigger) {
    openForColor(e, colorTrigger);
  }
}

function addTriggers() {
  setTimeout(() => {
    bricksInputs.forEach((field) => {
      const wrappers =
        typeof field === "string"
          ? [...document.querySelectorAll(field)]
          : [...document.querySelectorAll(field.selector)].filter((n) =>
              field.hasChild.some((c) => n.querySelector(c)),
            );
      wrappers.forEach((wrapper) => {
        const input = wrapper.querySelector("input[type='text']");
        if (input?.getAttribute("windpressbricks-variable-app") === "listened") {
          return;
        }

        input?.removeEventListener("focus", onFocusCallback);
        input?.addEventListener("focus", onFocusCallback);

        input?.setAttribute("windpressbricks-variable-app", "listened");
        input?.parentNode.setAttribute("data-balloon", "Shift + click to open the Variable Picker");
        input?.parentNode.setAttribute("data-balloon-pos", "bottom-right");
      });
    });

    document.querySelectorAll(".bricks-control-preview").forEach((popupTrigger) => {
      if (!getColorTrigger(popupTrigger)) {
        return;
      }

      popupTrigger.setAttribute("data-balloon", "Shift + click to open the Variable Picker");
      popupTrigger.setAttribute("data-balloon-pos", "bottom-right");
    });
  }, 100);
}

let isObserverRunning = false;
observe({
  selector: `#bricks-panel-inner`,
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

document.addEventListener("click", onDocumentClick, true);
document.addEventListener("contextmenu", onDocumentContextMenu, true);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isOpen.value) {
    isOpen.value = false;
  }
});

watch(isOpen, (value) => {
  variableApp.style.zIndex = value ? "calc(Infinity)" : "-1";
});

logger("Module loaded!", { module: "variable-picker" });
