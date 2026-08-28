// document.evaluate("//div[contains(@class, 'etch-html-block-properties-wrapper')]//label[contains(@class, 'etch-label')]/span[text()='class']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.parentElement

import { logger } from "@/integration/common/logger";
import { etchIframe } from "@/integration/etch/constant.js";
import Tribute from "tributejs";

// Declare 'wp' as a global variable if it's provided by WordPress in the browser environment
declare const wp: any;

const autocompleteItems = [];

async function registerSortCssAttr(containerEl: HTMLElement) {
  const classInput = containerEl.querySelector('input[type="text"]') as HTMLInputElement | null;
  if (!classInput) {
    return;
  }

  const classSortAction = document
    .createRange()
    .createContextualFragment(/*html*/ `
        <button id="windpressetch-sort-css-attr-action" title="[WindPress] Sort Class" type="button" class="etch-builder-button etch-builder-button--icon-placement-before etch-builder-button--variant-icon" style="--button-font-size: 13px; --e-icon-padding: 0; margin-left: auto;">
            <div class="icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="etch-icon iconify iconify--hugeicons-stroke" width="12px" height="12px" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M3 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" />
                    <path d="M10 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" />
                    <path d="M17 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" />
                    <path d="M5 11v-3a3 3 0 0 1 3 -3h8a3 3 0 0 1 3 3v3" />
                    <path d="M16.5 8.5l2.5 2.5l2.5 -2.5" />
                </svg>
            </div>
        </button>
    `)
    .querySelector("#windpressetch-sort-css-attr-action");

  wp.hooks.addAction("windpressetch-autocomplete-items-refresh", "windpressetch", () => {
    // wp hook filters. {value, color?, fontWeight?, namespace?}[]
    // autocompleteItems = wp.hooks.applyFilters('windpressetch-autocomplete-items', [], textInput.value);
  });

  wp.hooks.doAction("windpressetch-autocomplete-items-refresh");

  const tribute = new Tribute({
    containerClass: "windpressetch-tribute-container",

    autocompleteMode: true,

    // Limits the number of items in the menu
    menuItemLimit: 50,

    noMatchTemplate: "",

    values: async function (text, cb) {
      // if (!settingsState('module.plain-classes.autocomplete', true).value) {
      //     cb([]);
      //     return;
      // }

      const filters = await wp.hooks.applyFilters(
        "windpressetch-autocomplete-items-query",
        autocompleteItems,
        text,
      );
      cb(filters);
    },

    lookup: "value",

    itemClass: "class-item",

    // template
    menuItemTemplate: function (item) {
      let customStyle = "";

      if (item.original.color !== undefined) {
        customStyle += `background-color: ${item.original.color};`;
      }

      if (item.original.fontWeight !== undefined) {
        customStyle += `font-weight: ${item.original.fontWeight};`;
      }

      return `
                <span class="class-name" data-tribute-class-name="${item.original.value}">${item.string}</span>
                <span class="class-hint" style="${customStyle}"></span>
            `;
    },
  });

  tribute.setMenuContainer = function (el) {
    this.menuContainer = el;
  };

  const tributeEventCallbackOrigFn = tribute.events.callbacks;

  tribute.attach(classInput);

  const labelEl = containerEl.querySelector(":scope > span");
  if (labelEl instanceof HTMLElement && classSortAction) {
    labelEl.style.display = "flex";
    labelEl.appendChild(classSortAction);

    // add click event listener to the button
    classSortAction.querySelector("div.icon-wrapper").addEventListener("click", async () => {
      classInput.value = await etchIframe().contentWindow.windpress.module.classSorter.sort(
        classInput.value,
      );

      // Trigger input event to notify Etch about the change
      classInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  containerEl.dataset.windpressInjected = "true";
}

const observer = new MutationObserver(() => {
  const target: HTMLElement | null | undefined = document.evaluate(
    "//div[contains(@class, 'etch-html-block-properties-wrapper')]//label[contains(@class, 'etch-label')]/span[text()='class']",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue?.parentElement;

  if (target && !target.dataset.windpressInjected) {
    setTimeout(() => {
      if (target.dataset.windpressInjected) {
        return; // Already injected
      }

      registerSortCssAttr(target);
    }, 100); // Delay to ensure the element is ready
  }
});

observer.observe(document, {
  subtree: true,
  childList: true,
});

logger("Intellisense: element-attribute-panel.ts module loaded");
