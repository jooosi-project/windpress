/**
 * @module plain-classes
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Add plain classes to the element panel.
 */

import "./style.scss";

import { logger } from "@/integration/common/logger";

import tippy, { followCursor } from "tippy.js";

import { nextTick, ref, watch } from "vue";
import autosize from "autosize";
import Tribute from "tributejs";

import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

import HighlightInTextarea from "@/integration/library/highlight-in-textarea";
import {
  brxGlobalProp,
  brxIframeGlobalProp,
  brxIframe,
  settingsState,
} from "@/integration/bricks/constant";

import { debounce } from "lodash-es";

let shikiHighlighter = null;

(async () => {
  shikiHighlighter = await createHighlighterCore({
    themes: [import("shiki/themes/dark-plus.mjs"), import("shiki/themes/light-plus.mjs")],
    langs: [import("shiki/langs/css.mjs")],
    engine: createOnigurumaEngine(import("shiki/wasm")),
  });
})();

const textInput = document
  .createRange()
  .createContextualFragment(/*html*/ `
    <textarea id="windpressbricks-plc-input" class="windpressbricks-plc-input" rows="2" spellcheck="false"></textarea>
`)
  .querySelector("#windpressbricks-plc-input");

const containerAction = document
  .createRange()
  .createContextualFragment(/*html*/ `
    <div class="windpressbricks-plc-action-container">
        <div class="actions">
        </div>
    </div>
`)
  .querySelector(".windpressbricks-plc-action-container");
const containerActionButtons = containerAction.querySelector(".actions");

const classSortButton = document
  .createRange()
  .createContextualFragment(/*html*/ `
    <span id="windpressbricks-plc-class-sort" class="bricks-svg-wrapper windpressbricks-plc-class-sort" data-balloon="Automatic Class Sorting" data-balloon-pos="bottom-right">
        <svg  xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round" class="bricks-svg icon icon-tabler icons-tabler-outline icon-tabler-reorder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M10 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M17 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M5 11v-3a3 3 0 0 1 3 -3h8a3 3 0 0 1 3 3v3" /><path d="M16.5 8.5l2.5 2.5l2.5 -2.5" /></svg>    
    </span>
`)
  .querySelector("#windpressbricks-plc-class-sort");

const classToPlainClassesButton = document
  .createRange()
  .createContextualFragment(/*html*/ `
    <span id="windpressbricks-plc-class-down" class="bricks-svg-wrapper windpressbricks-plc-class-down" data-balloon="Move Classes to Plain Classes" data-balloon-pos="bottom-right">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><!-- Icon from Lucide by Lucide Contributors - https://github.com/lucide-icons/lucide/blob/main/LICENSE --><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.5 13h6M2 16l4.5-9l4.5 9m7-9v9m-4-4l4 4l4-4"/></svg>    
    </span>
`)
  .querySelector("#windpressbricks-plc-class-down");

containerActionButtons.appendChild(classToPlainClassesButton);
containerActionButtons.appendChild(classSortButton);

const visibleElementPanel = ref(false);
const activeElementId = ref(null);

let hit = null; // highlight any text except spaces and new lines

autosize(textInput);

let autocompleteItems = [];

wp.hooks.addAction("windpressbricks-autocomplete-items-refresh", "windpressbricks", () => {
  // wp hook filters. {value, color?, fontWeight?, namespace?}[]
  autocompleteItems = wp.hooks.applyFilters(
    "windpressbricks-autocomplete-items",
    [],
    textInput.value,
  );
});

wp.hooks.doAction("windpressbricks-autocomplete-items-refresh");

const tribute = new Tribute({
  containerClass: "windpressbricks-tribute-container",

  autocompleteMode: true,

  // Limits the number of items in the menu
  menuItemLimit: 50,

  noMatchTemplate: "",

  values: async function (text, cb) {
    if (!settingsState("module.plain-classes.autocomplete", true).value) {
      cb([]);
      return;
    }

    const filters = await wp.hooks.applyFilters(
      "windpressbricks-autocomplete-items-query",
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

tribute.events.callbacks = function () {
  return {
    ...tributeEventCallbackOrigFn.call(this),
    up: (e, el) => {
      // navigate up ul
      if (this.tribute.isActive && this.tribute.current.filteredItems) {
        e.preventDefault();
        e.stopPropagation();
        let count = this.tribute.current.filteredItems.length,
          selected = this.tribute.menuSelected;

        if (count > selected && selected > 0) {
          this.tribute.menuSelected--;
          this.setActiveLi();
        } else if (selected === 0) {
          this.tribute.menuSelected = count - 1;
          this.setActiveLi();
          this.tribute.menu.scrollTop = this.tribute.menu.scrollHeight;
        }
        previewTributeEventCallbackUpDown();
      }
    },
    down: (e, el) => {
      // navigate down ul
      if (this.tribute.isActive && this.tribute.current.filteredItems) {
        e.preventDefault();
        e.stopPropagation();
        let count = this.tribute.current.filteredItems.length - 1,
          selected = this.tribute.menuSelected;

        if (count > selected) {
          this.tribute.menuSelected++;
          this.setActiveLi();
        } else if (count === selected) {
          this.tribute.menuSelected = 0;
          this.setActiveLi();
          this.tribute.menu.scrollTop = 0;
        }
        previewTributeEventCallbackUpDown();
      }
    },
  };
};

tribute.attach(textInput);

const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.type === "attributes") {
      if (mutation.target.id === "bricks-panel-element" && mutation.attributeName === "style") {
        if (mutation.target.style.display !== "none") {
          visibleElementPanel.value = true;
        } else {
          visibleElementPanel.value = false;
        }
      } else if (
        "placeholder" === mutation.attributeName &&
        "INPUT" === mutation.target.tagName &&
        mutation.target.classList.contains("placeholder")
      ) {
        activeElementId.value = brxGlobalProp.$_activeElement.value.id;
      }
    } else if (mutation.type === "childList") {
      if (mutation.addedNodes.length > 0) {
        if (
          mutation.target.id === "bricks-panel-sticky" &&
          mutation.addedNodes[0].id === "bricks-panel-element-classes"
        ) {
          activeElementId.value = brxGlobalProp.$_activeElement.value.id;
        } else if (
          mutation.target.dataset &&
          mutation.target.dataset.controlkey === "_cssClasses" &&
          mutation.addedNodes[0].childNodes.length > 0
        ) {
          document.querySelector("#_cssClasses").addEventListener("input", function (e) {
            nextTick(() => {
              textInput.value = e.target.value;
              onTextInputChanges();
            });
          });
        }
      }
    }
  });
});

observer.observe(document.getElementById("bricks-panel-element"), {
  subtree: true,
  attributes: true,
  childList: true,
});

watch([activeElementId, visibleElementPanel], (newVal, oldVal) => {
  if (newVal[0] !== oldVal[0]) {
    nextTick(() => {
      textInput.value = brxGlobalProp.$_activeElement.value?.settings?._cssClasses || "";
      onTextInputChanges();
    });
  }

  if (newVal[0] && newVal[1]) {
    nextTick(() => {
      const panelElementClassesEl = document.querySelector("#bricks-panel-element-classes");
      if (
        settingsState("module.plain-classes.input-field", true).value &&
        panelElementClassesEl.querySelector(".windpressbricks-plc-input") === null
      ) {
        panelElementClassesEl.appendChild(containerAction);

        panelElementClassesEl.appendChild(textInput);
        hit = new HighlightInTextarea(textInput, {
          highlight: [
            {
              highlight: /(?<=\s|^)(?:(?!\s).)+(?=\s|$)/g,
              className: "word",
            },
            {
              highlight: /(?<=\s)\s/g,
              className: "multispace",
              blank: true,
            },
          ],
        });

        autosize.update(textInput);
      }
    });
  }
});

textInput.addEventListener("input", function (e) {
  brxGlobalProp.$_activeElement.value.settings._cssClasses = e.target.value;
});

function onTextInputChanges() {
  nextTick(() => {
    try {
      hit.handleInput();
    } catch (error) {}
    autosize.update(textInput);
    // tribute.setMenuContainer(document.querySelector('div.hit-container'));
    tribute.hideMenu();
  });
}

// Disabled until the feature is stable
textInput.addEventListener("highlights-updated", function (e) {
  hoverPreviewProvider();
});

// create a tippy instance that will be used to show the hover preview, but not yet shown
let tippyInstance = tippy(document.createElement("div"), {
  plugins: [followCursor],
  allowHTML: true,
  arrow: false,
  duration: [500, 0],
  followCursor: true,
  trigger: "manual",
});

function hoverPreviewProvider() {
  const hitContainerEl = document.querySelector(".hit-container");

  if (hitContainerEl === null) {
    return;
  }

  tippyInstance.reference = hitContainerEl;

  async function showTippy(markWordElement) {
    const classname = markWordElement.textContent;
    const generatedCssCode =
      await brxIframe.contentWindow.windpress.module.classnameToCss.generate(classname);
    if (generatedCssCode === null || generatedCssCode.trim() === "") {
      return null;
    }

    tippyInstance.setContent(
      shikiHighlighter.codeToHtml(generatedCssCode, {
        lang: "css",
        theme: "dark-plus",
      }),
    );

    tippyInstance.show();
  }

  const currentMarkWordElement = ref(null);

  const debouncedMousemoveHandler = debounce(function (event) {
    if (!settingsState("module.plain-classes.hover-preview-classes", true).value) {
      return;
    }

    const x = event.clientX;
    const y = event.clientY;

    // get all elements that overlap the mouse
    const elements = document.elementsFromPoint(x, y);

    // find the first `mark` element
    const firstMarkWordElement = elements.find((element) => {
      return element.matches('mark[class="word"]');
    });

    currentMarkWordElement.value = firstMarkWordElement || null;
  }, 10);

  // when mouse are entering the `.hit-container` element, get the coordinates of the mouse and check if the mouse is hovering the `mark` element
  hitContainerEl.addEventListener("mousemove", debouncedMousemoveHandler);

  hitContainerEl.addEventListener("mouseleave", function (event) {
    debouncedMousemoveHandler.cancel();
    currentMarkWordElement.value = null;
  });

  watch(currentMarkWordElement, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      showTippy(newVal);
    } else {
      tippyInstance.hide();
    }
  });
}

const observerAutocomplete = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        const className = node.querySelector(".class-name").dataset.tributeClassName;

        node.addEventListener("mouseenter", (e) => {
          previewAddClass(className);
        });

        node.addEventListener("mouseleave", (e) => {
          previewResetClass();
        });

        node.addEventListener("click", (e) => {
          previewResetClass();
        });
      });
    }
  });
});

let menuAutocompleteItemeEl = null;

textInput.addEventListener("tribute-active-true", function (e) {
  if (menuAutocompleteItemeEl === null) {
    menuAutocompleteItemeEl = document.querySelector(".windpressbricks-tribute-container>ul");
  }
  nextTick(() => {
    if (menuAutocompleteItemeEl) {
      observerAutocomplete.observe(menuAutocompleteItemeEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  });
});

classSortButton.addEventListener("click", async function (e) {
  textInput.value = await brxIframe.contentWindow.windpress.module.classSorter.sort(
    textInput.value,
  );
  brxGlobalProp.$_activeElement.value.settings._cssClasses = textInput.value;
  onTextInputChanges();
});

classToPlainClassesButton.addEventListener("click", async function (e) {
  const activeEl = brxGlobalProp.$_activeElement.value;
  const currPlainClasses = textInput.value.split(" ");
  const bricksGlobalClasses = activeEl.settings?._cssGlobalClasses
    ? [...activeEl.settings._cssGlobalClasses]
    : [];

  bricksGlobalClasses.forEach((globalClass) => {
    let getGlobalClassName = brxGlobalProp.$_getGlobalClassName(globalClass);
    if (currPlainClasses.includes(getGlobalClassName)) {
      return;
    }
    currPlainClasses.push(getGlobalClassName);
  });

  textInput.value = currPlainClasses.join(" ");
  brxGlobalProp.$_activeElement.value.settings._cssClasses = textInput.value;
  brxGlobalProp.$_activeElement.value.settings._cssGlobalClasses = [];
  onTextInputChanges();
});

function previewAddClass(className) {
  const elementNode = brxIframeGlobalProp.$_getElementNode(
    brxIframeGlobalProp.$_activeElement.value,
  );
  elementNode.classList.add(className);
}

function previewResetClass() {
  const activeEl = brxIframeGlobalProp.$_activeElement.value;
  const elementNode = brxIframeGlobalProp.$_getElementNode(activeEl);
  const elementClasses = brxIframeGlobalProp.$_getElementClasses(activeEl);
  elementNode.classList.value = elementClasses.join(" ");
}

function previewTributeEventCallbackUpDown() {
  let li = tribute.menu.querySelector("li.highlight>span.class-name");
  const activeEl = brxIframeGlobalProp.$_activeElement.value;
  const elementNode = brxIframeGlobalProp.$_getElementNode(activeEl);
  const elementClasses = brxIframeGlobalProp.$_getElementClasses(activeEl);
  elementNode.classList.value = elementClasses.join(" ") + " " + li.dataset.tributeClassName;
}

logger("Module loaded!", { module: "plain-classes" });
