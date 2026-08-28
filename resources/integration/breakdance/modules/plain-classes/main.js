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
import { debounce, set } from "lodash-es";

import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

import HighlightInTextarea from "@/integration/library/highlight-in-textarea.js";
import { bdeV, bdeIframe, bdeIframeCanvas, bdeIframeV } from "@/integration/breakdance/constant.js";

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
    <textarea id="windpressbreakdance-plc-input" class="windpressbreakdance-plc-input" rows="2" spellcheck="false"></textarea>
`)
  .querySelector("#windpressbreakdance-plc-input");

const textInputContainer = document.createElement("div");
textInputContainer.classList.add("windpressbreakdance-plc-input-container");

textInputContainer.appendChild(textInput);

const containerAction = document
  .createRange()
  .createContextualFragment(/*html*/ `
    <div class="windpressbreakdance-plc-action-container">
        <div class="actions">
        </div>
    </div>
`)
  .querySelector(".windpressbreakdance-plc-action-container");
const containerActionButtons = containerAction.querySelector(".actions");

const classSortButton = document
  .createRange()
  .createContextualFragment(/*html*/ `
    <span id="windpressbreakdance-plc-class-sort" class="bricks-svg-wrapper windpressbreakdance-plc-class-sort" data-balloon="Automatic Class Sorting" data-balloon-pos="bottom-right">
        <svg  xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round" class="bricks-svg icon icon-tabler icons-tabler-outline icon-tabler-reorder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M10 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M17 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M5 11v-3a3 3 0 0 1 3 -3h8a3 3 0 0 1 3 3v3" /><path d="M16.5 8.5l2.5 2.5l2.5 -2.5" /></svg>    
    </span>
`)
  .querySelector("#windpressbreakdance-plc-class-sort");
containerActionButtons.appendChild(classSortButton);

const visibleElementPanel = ref(false); // 0 = hidden, > 0 = visible
const activeElementId = ref(null);

let hit = null; // highlight any text except spaces and new lines

autosize(textInput);

let autocompleteItems = [];

wp.hooks.addAction("windpressbreakdance-autocomplete-items-refresh", "windpressbreakdance", () => {
  // wp hook filters. {value, color?, fontWeight?, namespace?}[]
  autocompleteItems = wp.hooks.applyFilters(
    "windpressbreakdance-autocomplete-items",
    [],
    textInput.value,
  );
});

wp.hooks.doAction("windpressbreakdance-autocomplete-items-refresh");

const tribute = new Tribute({
  menuContainer: document.querySelector("#app"),

  containerClass: "windpressbreakdance-tribute-container",

  autocompleteMode: true,

  // Limits the number of items in the menu
  menuItemLimit: 50,

  noMatchTemplate: "",

  values: async function (text, cb) {
    const filters = await wp.hooks.applyFilters(
      "windpressbreakdance-autocomplete-items-query",
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

bdeV.$store.subscribeAction((action, state) => {
  if (action.type === "ui/activateElement") {
    activeElementId.value = action.payload;
  }

  if (action.type === "ui/setLeftSidebarState") {
    visibleElementPanel.value = action.payload === "elementproperties" ? true : false;
  }
});

watch([activeElementId, visibleElementPanel], (newVal, oldVal) => {
  if (newVal[0] !== oldVal[0]) {
    nextTick(() => {
      classDownstream();
      onTextInputChanges();
    });
  }

  if (newVal[0] && newVal[1]) {
    nextTick(() => {
      const panelElementClassesEl = document.querySelector(
        ".breakdance-element-properties-panel .vscroll-scroll .vscroll-scroll",
      );
      if (
        panelElementClassesEl &&
        panelElementClassesEl.querySelector(".windpressbreakdance-plc-input") === null
      ) {
        panelElementClassesEl.insertBefore(textInputContainer, panelElementClassesEl.firstChild);
      }
    });
  }
});

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

async function classDownstream() {
  textInput.value =
    bdeV.$store.getters["ui/activeElement"].data?.properties?.settings?.advanced?.classes?.join(
      " ",
    ) || "";
}

// Stupid way to check if the path is exist
async function checkUpstreamPath() {
  if (bdeV.$store.getters["ui/activeElement"].data?.properties?.settings?.advanced?.classes) {
    return true;
  }

  const tab = document.querySelector(
    ".properties-panel-tab.breakdance-tab.breakdance-tab--id-settings",
  );
  tab.click();

  let subtab = document.querySelector(
    "#settings .properties-panel-accordion.conditional-control-display-visible>div",
  );
  while (subtab === null) {
    subtab = document.querySelector(
      "#settings .properties-panel-accordion.conditional-control-display-visible>div",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!subtab.parentElement.classList.contains("expanded")) {
    subtab.click();
  }

  let inp = document.querySelector(
    '#breakdance-class-input-search input[placeholder=".my-cool-class"]',
  );

  while (inp === null) {
    inp = document.querySelector(
      '#breakdance-class-input-search input[placeholder=".my-cool-class"]',
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // focus the input
  inp.focus();

  // type the value to the input like a human
  const text = "windpressbreakdance";
  inp.value = text;
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 100));

  const btn = document.querySelector("#breakdance-class-input-search>button");
  btn.click();

  return true;
}

// delay to 50ms
const debouncedClassUpstream = debounce(classUpstream, 50);

async function classUpstream() {
  if (!(await checkUpstreamPath())) {
    logger("Upstream path not found!", { module: "plain-classes", type: "error" });
    return;
  }

  // bring back the focus to the input
  textInput.focus();

  set(
    bdeV.$store.getters["ui/activeElement"].data,
    "properties.settings.advanced.classes",
    textInput.value
      .trim()
      .split(" ")
      .filter((c) => c.trim() !== "") || [],
  );

  // TODO: register class as global selectors.
}

textInput.addEventListener("input", function (e) {
  debouncedClassUpstream();
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
          previewAddClass(className);
        });
      });
    }
  });
});

let menuAutocompleteItemeEl = null;

textInput.addEventListener("tribute-active-true", function (e) {
  if (menuAutocompleteItemeEl === null) {
    menuAutocompleteItemeEl = document.querySelector(".windpressbreakdance-tribute-container>ul");
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

function previewAddClass(className) {
  const activeEl = bdeIframeV.$store.getters["ui/activeElement"].id;
  const elementNode = bdeIframeCanvas.querySelector(`[data-node-id="${activeEl}"]`);
  // add class to the element
  elementNode.classList.add(className);

  // store the class name to the data-tribute-class-name attribute
  elementNode.dataset.tributeClassName = className;
}

function previewResetClass() {
  resetTributeClass();
}

function previewTributeEventCallbackUpDown() {
  let li = tribute.menu.querySelector("li.highlight>span.class-name");

  previewResetClass();
  previewAddClass(li.dataset.tributeClassName);
}

function resetTributeClass() {
  const activeEl = bdeIframeV.$store.getters["ui/activeElement"].id;
  const elementNode = bdeIframeCanvas.querySelector(`[data-node-id="${activeEl}"]`);
  if (elementNode.dataset.tributeClassName) {
    elementNode.classList.remove(elementNode.dataset.tributeClassName);
    elementNode.dataset.tributeClassName = "";
  }
}

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
      await bdeIframe.contentWindow.windpress.module.classnameToCss.generate(classname);
    if (generatedCssCode === null || generatedCssCode.trim() === "") {
      return null;
    }

    tippyInstance.setContent(
      shikiHighlighter.codeToHtml(generatedCssCode, {
        lang: "css",
        theme: document.querySelector("div#app.theme--light") !== null ? "light-plus" : "dark-plus",
      }),
    );

    tippyInstance.show();
  }

  const currentMarkWordElement = ref(null);

  const debouncedMousemoveHandler = debounce(function (event) {
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

logger("Module loaded!", { module: "plain-classes" });
