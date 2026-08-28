import { createVirtualRef } from "@/dashboard/composables/virtualRef";
import { logger } from "@/integration/common/logger";
import { watch } from "vue";
import Logo from "~/windpress.svg?raw";
import { bdeIframe } from "@/integration/oxygen/constant.js";

const breakdanceToolbarSelector = ".topbar-section.undo-redo-top-bar-section";
const settingsButtonId = "windpressoxygen-settings-button";
const settingsButtonActiveClass = "breakdance-toolbar-icon-button-active";
const mountRetryLimit = 20;
const mountRetryDelay = 250;

const settingButtonHtml = document.createRange().createContextualFragment(/*html*/ `
    <div class="topbar-section topbar-section-bl">
        <div id="${settingsButtonId}" class="breakdance-toolbar-icon-button" role="button" tabindex="0" aria-label="Open WindPress settings" title="WindPress settings">
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

let settingsButton;
let isWatchingState = false;

function mountSettingsButton(retryCount = 0) {
  const existingSettingsButton = document.querySelector(`#${settingsButtonId}`);

  if (existingSettingsButton) {
    setupSettingsButton(existingSettingsButton);

    return;
  }

  const breakdanceToolbar = document.querySelector(breakdanceToolbarSelector)
    ?? document.querySelector(".topbar-section");

  if (!breakdanceToolbar?.parentNode) {
    if (retryCount < mountRetryLimit) {
      setTimeout(() => mountSettingsButton(retryCount + 1), mountRetryDelay);

      return;
    }

    logger("Unable to mount the settings button: toolbar not found.", { module: "settings", type: "warn" });

    return;
  }

  breakdanceToolbar.parentNode.insertBefore(settingButtonHtml, breakdanceToolbar);

  setupSettingsButton(document.querySelector(`#${settingsButtonId}`));
}

function getWindPressIframe() {
  return document.querySelector("#windpress-iframe")
    ?? bdeIframe?.contentDocument?.querySelector("#windpress-iframe");
}

function toggleMinimize() {
  const currentVal = getVirtualRef("window.minimized", false).value;

  getVirtualRef("window.minimized", false).value = !currentVal;
}

function openWindPressDashboard() {
  const adminUrl = window.windpressoxygen?.site_meta?.admin_url;

  if (!adminUrl) {
    logger("Unable to open WindPress settings: admin URL is missing.", { module: "settings", type: "warn" });

    return;
  }

  window.open(adminUrl, "_blank", "noopener,noreferrer");
}

function syncButtonState(isOpen) {
  const windpressIframe = getWindPressIframe();

  settingsButton?.classList.toggle(settingsButtonActiveClass, Boolean(windpressIframe && isOpen));
  settingsButton?.setAttribute("aria-pressed", String(Boolean(windpressIframe && isOpen)));

  if (windpressIframe) {
    windpressIframe.style.display = isOpen ? "block" : "none";
  }
}

function handleSettingsButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!getWindPressIframe()) {
    openWindPressDashboard();

    return;
  }

  toggleMinimize();
  syncButtonState(!getVirtualRef("window.minimized", false).value);
}

function setupSettingsButton(button) {
  if (!button || button.dataset.windpressoxygenSettingsMounted === "true") {
    return;
  }

  settingsButton = button;
  settingsButton.dataset.windpressoxygenSettingsMounted = "true";

  // add click event listener to the settings button
  settingsButton.addEventListener("click", handleSettingsButtonClick);
  settingsButton.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) {
      return;
    }

    handleSettingsButtonClick(event);
  });

  if (!isWatchingState) {
    isWatchingState = true;

    watch(
      () => getVirtualRef("window.minimized", false).value,
      (value) => {
        syncButtonState(!value);
      },
    );
  }

  syncButtonState(!getVirtualRef("window.minimized", false).value);
}

mountSettingsButton();

logger("Module loaded!", { module: "settings" });
