import "./style.scss";

import { createVirtualRef } from "@/dashboard/composables/virtualRef";
import { logger } from "@/integration/common/logger";
import Logo from "~/windpress.svg?raw";

const oxygenToolbarSelector = "#oxygen-topbar .oxygen-toolbar-menus:has(.oxygen-dom-tree-button)";

// create element from html string
const settingButtonHtml = document.createRange().createContextualFragment(/*html*/ `
    <div class="windpressoxygen-settings-button">
        ${Logo}
    </div>
`);

const { getVirtualRef } = createVirtualRef(
  {},
  {
    persist: "windpress.ui.state",
  },
);

// add the button to the bricks toolbar as the first item
const oxygenToolbar = document.querySelector(oxygenToolbarSelector);
oxygenToolbar.insertBefore(settingButtonHtml, oxygenToolbar.firstChild);
window.tippy(".windpressoxygen-settings-button", {
  // content: 'WindPress — Oxygen settings',
  content: "WindPress is detected",
  animation: "shift-toward",
  placement: "bottom",
});

const settingsButton = document.querySelector(".windpressoxygen-settings-button");

// function toggleMinimize() {
//     const currentVal = getVirtualRef('window.minimized', false).value;

//     getVirtualRef('window.minimized', false).value = !currentVal;

//     if (!currentVal === true) {
//         settingsButton.classList.remove('active');
//     } else {
//         settingsButton.classList.add('active');
//     }
// }

// settingsButton.addEventListener('click', (event) => {
//     toggleMinimize();
// });

logger("Module loaded!", { module: "settings" });
