import "./style.scss";

import { ref, createApp, watch } from "vue";
import { logger } from "@/integration/common/logger";
import Logo from "~/windpress.svg?raw";
import App from "./App.vue";

const bricksToolbarSelector =
  "#bricks-toolbar ul.group-wrapper.end, #bricks-toolbar ul.group-wrapper.right";

// create element from html string
const settingButtonHtml = document.createRange().createContextualFragment(/*html*/ `
    <li id="windpressbricks-settings-navbar" data-balloon="WindPress — Bricks settings" data-balloon-pos="bottom">
        <span class="bricks-svg-wrapper">
            ${Logo}
        </span>
    </li>
`);

// add the button to the bricks toolbar as the first item
const bricksToolbar = document.querySelector(bricksToolbarSelector);
bricksToolbar.insertBefore(settingButtonHtml, bricksToolbar.firstChild);

// select the settings button
const settingsButton = document.querySelector("#windpressbricks-settings-navbar");

const isOpen = ref(false);
const mousePosition = ref({ x: null, y: null });

const settingsApp = document.createElement("windpressbricks-settings-app");
settingsApp.id = "windpressbricks-settings-app";
settingsApp.classList.add("master-css");
document.querySelector("div.brx-body.main").appendChild(settingsApp);

// add right click event listener to the settings button
settingsButton.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  isOpen.value = !isOpen.value;
  mousePosition.value = {
    x: event.clientX,
    y: event.clientY,
  };
});

// close the settings app when clicked outside
function clickOutside(event) {
  if (event.target.closest("#windpressbricks-settings-app")) {
    return;
  }

  isOpen.value = false;
}

watch(isOpen, (state) => {
  if (!state) {
    document.removeEventListener("click", clickOutside);
  } else {
    document.addEventListener("click", clickOutside, { once: true });
  }
});

const app = createApp(App);

app.provide("isOpen", isOpen);
app.provide("mousePosition", mousePosition);
app.mount("#windpressbricks-settings-app");

logger("Module loaded!", { module: "settings" });
