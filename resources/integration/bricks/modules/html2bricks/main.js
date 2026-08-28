/**
 * @module html2bricks
 * @package WindPress
 * @since 1.0.1
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Convert HTML string to Bricks element
 */

import { brxGlobalProp, settingsState } from "@/integration/bricks/constant.js";
import { watch } from "vue";
import { logger } from "@/integration/common/logger";
import { parse } from "./dom2elements.js";

/**
 * Check and request clipboard permission
 *
 * @see https://web.dev/articles/async-clipboard
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard
 */
async function queryClipboardPermission(permissionName) {
  if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
    return null;
  }

  try {
    return await navigator.permissions.query({ name: permissionName });
  } catch {
    return null;
  }
}

async function checkAndRequestClipboardPermission() {
  if (
    !navigator.clipboard ||
    typeof navigator.clipboard.readText !== "function" ||
    typeof navigator.clipboard.writeText !== "function"
  ) {
    logger("Clipboard API not supported", { module: "html2bricks", type: "error" });
    return false;
  }

  const readStatus = await queryClipboardPermission("clipboard-read");

  if (readStatus && readStatus.state === "denied") {
    logger("Clipboard-read permission denied", { module: "html2bricks", type: "error" });
    return false;
  }

  let clipboardContent = "";

  try {
    clipboardContent = await navigator.clipboard.readText();
  } catch (error) {
    logger("Clipboard-read permission denied", error, { module: "html2bricks", type: "error" });
    return false;
  }

  const writeStatus = await queryClipboardPermission("clipboard-write");

  if (writeStatus && writeStatus.state === "denied") {
    logger("Clipboard-write permission denied", { module: "html2bricks", type: "error" });
    return false;
  }

  try {
    await navigator.clipboard.writeText(clipboardContent);
  } catch (error) {
    logger("Clipboard-write permission denied", error, { module: "html2bricks", type: "error" });
    return false;
  }

  return true;
}

function getClipboardTextFromPasteEvent(event) {
  if (!event.clipboardData) {
    return "";
  }

  return (
    event.clipboardData.getData("text/html") ||
    event.clipboardData.getData("text/plain") ||
    ""
  ).trim();
}

async function htmlPasteHandler(sourceClipboardText = "") {
  let clipboardText = typeof sourceClipboardText === "string" ? sourceClipboardText.trim() : "";

  if (!clipboardText) {
    if (!(await checkAndRequestClipboardPermission())) {
      brxGlobalProp.$_showMessage("[WindPress] Clipboard access not available");
      return;
    }

    try {
      clipboardText = (await navigator.clipboard.readText()).trim();
    } catch (error) {
      logger("Clipboard-read permission denied", error, { module: "html2bricks", type: "error" });
      brxGlobalProp.$_showMessage("[WindPress] Clipboard access not available");
      return;
    }
  }

  if (!clipboardText || clipboardText.charAt(0) !== "<") {
    logger("Pasted content is not HTML", { module: "html2bricks", type: "error" });
    brxGlobalProp.$_showMessage("[WindPress] Pasted content is not HTML");
    return;
  }

  // parse HTML string to DOM
  const doc = new DOMParser().parseFromString(clipboardText, "text/html").body;

  // convert DOM to Bricks element
  const bricksElements = parse(doc);

  const bricksData = {
    content: bricksElements,
    source: "bricksCopiedElements",
    sourceUrl: window.bricksData.siteUrl,
    version: window.bricksData.version,
    globalClasses: [],
    globalElements: [],
  };

  try {
    // copy to clipboard
    await navigator.clipboard.writeText(JSON.stringify(bricksData, null));
  } catch (error) {
    logger("Clipboard-write permission denied", error, { module: "html2bricks", type: "error" });
    brxGlobalProp.$_showMessage("[WindPress] Clipboard access not available");
    return;
  }

  brxGlobalProp.$_pasteElements();

  brxGlobalProp.$_showMessage("[WindPress] HTML pasted");

  // restore clipboard content
  // await navigator.clipboard.writeText(clipboardText);
}

/**
 * Convert HTML string to Bricks element
 *
 * Windows: Ctrl + Shift + V
 * Mac: Cmd + Shift + V
 */
let pendingShortcutPaste = false;
let pendingShortcutPasteTimeout = null;

function resetPendingShortcutPaste() {
  pendingShortcutPaste = false;

  if (pendingShortcutPasteTimeout) {
    window.clearTimeout(pendingShortcutPasteTimeout);
    pendingShortcutPasteTimeout = null;
  }
}

document.addEventListener(
  "paste",
  (event) => {
    if (!pendingShortcutPaste || !settingsState("module.html2bricks.copy-paste", true).value) {
      return;
    }

    resetPendingShortcutPaste();
    event.preventDefault();
    event.stopPropagation();

    const clipboardText = getClipboardTextFromPasteEvent(event);

    htmlPasteHandler(clipboardText);
  },
  true,
);

document.addEventListener(
  "keydown",
  (event) => {
    if (!settingsState("module.html2bricks.copy-paste", true).value) {
      return;
    }

    if (event.target.id === "bricks-toolbar" || event.target.id === "bricks-panel") {
      return;
    }

    if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== "v") {
      return;
    }

    event.stopPropagation();

    pendingShortcutPaste = true;
    if (pendingShortcutPasteTimeout) {
      window.clearTimeout(pendingShortcutPasteTimeout);
    }

    pendingShortcutPasteTimeout = window.setTimeout(() => {
      if (!pendingShortcutPaste) {
        return;
      }

      resetPendingShortcutPaste();
      htmlPasteHandler();
    }, 0);
  },
  true,
);

const pasteMenu = document.createElement("li");
pasteMenu.id = "windpressbricks-html2bricks-context-menu";
pasteMenu.classList.add("sep");
pasteMenu.innerHTML =
  '<span class="label">Paste HTML</span><span class="shortcut">CTRL + SHIFT + V</span>';
pasteMenu.addEventListener("click", htmlPasteHandler);

const pasteHTMLStructureHeader = document.createElement("li");
pasteHTMLStructureHeader.dataset.balloon = "Paste HTML";
pasteHTMLStructureHeader.dataset.balloonPos = "bottom-right";
pasteHTMLStructureHeader.innerHTML = /*html*/ `
    <span class="bricks-svg-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icon icon-tabler icons-tabler-outline icon-tabler-brand-html5" fill="none" stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 4l-2 14.5l-6 2l-6 -2l-2 -14.5z" /><path d="M15.5 8h-7l.5 4h6l-.5 3.5l-2.5 .75l-2.5 -.75l-.1 -.5" /></svg>
    </span>
`;

pasteHTMLStructureHeader.addEventListener("click", htmlPasteHandler);

function getPasteItemContextMenu() {
  return document.querySelector("#bricks-builder-context-menu li:nth-child(2)");
}

function getPasteItemStructureHeader() {
  const actions = document.querySelector("#bricks-panel-header > ul.actions");
  const pasteAllBalloon = `${brxGlobalProp.i18n?.paste ?? "Paste"} (${brxGlobalProp.i18n?.all ?? "All"})`;

  return [...(actions?.children ?? [])].find((item) => item.dataset.balloon === pasteAllBalloon);
}

const addControl = () => {
  const pasteItemContextMenu = getPasteItemContextMenu();
  if (pasteItemContextMenu && !pasteMenu.isConnected) {
    pasteItemContextMenu.classList.remove("sep");
    pasteItemContextMenu.insertAdjacentElement("afterend", pasteMenu);
  }

  const pasteItemStructureHeader = getPasteItemStructureHeader();
  if (pasteItemStructureHeader && !pasteHTMLStructureHeader.isConnected) {
    pasteItemStructureHeader.insertAdjacentElement("afterend", pasteHTMLStructureHeader);
  }
};

const removeControl = () => {
  getPasteItemContextMenu()?.classList.add("sep");
  pasteMenu.remove();
  pasteHTMLStructureHeader.remove();
};

// initial
if (settingsState("module.html2bricks.copy-paste", true).value) {
  addControl();
}

watch(
  () => settingsState("module.html2bricks.copy-paste", true).value,
  (value) => {
    if (value) {
      addControl();
    } else {
      removeControl();
    }
  },
);

logger("Module loaded!", { module: "html2bricks" });
