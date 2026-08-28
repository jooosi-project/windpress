import "./style.scss";

import { createVirtualRef } from "@/dashboard/composables/virtualRef";
import { logger } from "@/integration/common/logger";
import Logo from "~/windpress.svg?raw";

// create element from html string
const settingButtonHtml = document.createRange().createContextualFragment(/*html*/ `
    <button id="windpressbuilderius-settings-navbar" data-tooltip-content="WindPress — Builderius settings" data-tooltip-place="bottom" class="uniPanelButton">
        <span class="">
            ${Logo}
        </span>
    </button>
`);

const { getVirtualRef } = createVirtualRef(
  {},
  {
    persist: "windpress.ui.state",
  },
);

// add the button to the builderius toolbar as the first item
const builderiusToolbar = document.querySelector(".uniTopPanel__rightCol");
builderiusToolbar.prepend(settingButtonHtml);

// select the settings button
const settingsButton = document.querySelector("#windpressbuilderius-settings-navbar");

function toggleMinimize() {
  const currentVal = getVirtualRef("window.minimized", false).value;

  getVirtualRef("window.minimized", false).value = !currentVal;

  if (!currentVal === true) {
    settingsButton.classList.remove("active");
  } else {
    settingsButton.classList.add("active");
  }
}

// add click event listener to the settings button
settingsButton.addEventListener("click", (event) => {
  toggleMinimize();
});

logger("Module loaded!", { module: "settings" });
