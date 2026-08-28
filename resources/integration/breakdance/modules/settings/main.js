import { createVirtualRef } from "@/dashboard/composables/virtualRef";
import { logger } from "@/integration/common/logger";
import { watch } from "vue";
import Logo from "~/windpress.svg?raw";
import { bdeIframe } from "@/integration/breakdance/constant.js";

const breakdanceToolbarSelector = ".topbar-section.undo-redo-top-bar-section";

const settingButtonHtml = document.createRange().createContextualFragment(/*html*/ `
    <div class="topbar-section topbar-section-bl">
        <div id="windpressbreakdance-settings-button" class="breakdance-toolbar-icon-button">
            <div class="breakdance-icon" style="width: 18px; height: 18px;">
                ${Logo}
            </div>
        </div>
    </div>
`);

const { getVirtualRef } = createVirtualRef(
  {},
  {
    persist: "windpress.ui.state",
  },
);

// add the button as the previous sibling of the breakdanceToolbar
const breakdanceToolbar = document.querySelector(breakdanceToolbarSelector);
breakdanceToolbar.parentNode.insertBefore(
  settingButtonHtml,
  breakdanceToolbar.previousElementSibling,
);

// select the settings button
const settingsButton = document.querySelector("#windpressbreakdance-settings-button");
const windpressIframe = bdeIframe?.contentDocument.querySelector("#windpress-iframe");

function toggleMinimize() {
  const currentVal = getVirtualRef("window.minimized", false).value;

  getVirtualRef("window.minimized", false).value = !currentVal;
}

function toggleButtonClass(currentVal) {
  if (!currentVal === true) {
    settingsButton.classList.remove("breakdance-toolbar-icon-button-active");
  } else {
    settingsButton.classList.add("breakdance-toolbar-icon-button-active");
  }

  if (windpressIframe) {
    windpressIframe.style.display = currentVal ? "block" : "none";
  }
}

// add click event listener to the settings button
settingsButton.addEventListener("click", (event) => {
  toggleMinimize();
});

watch(
  () => getVirtualRef("window.minimized", false).value,
  (value) => {
    toggleButtonClass(!value);
  },
);

toggleButtonClass(!getVirtualRef("window.minimized", false).value);

logger("Module loaded!", { module: "settings" });
