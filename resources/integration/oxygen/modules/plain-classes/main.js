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
import { debounce } from "lodash-es";

import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

import HighlightInTextarea from "@/integration/library/highlight-in-textarea.js";
import {
  bdeDocumentStore,
  bdeGlobalStore,
  bdeIframe,
  bdeIframeCanvas,
  bdeUiStore,
} from "@/integration/oxygen/constant.js";

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
    <textarea id="windpressoxygen-plc-input" class="windpressoxygen-plc-input" rows="2" spellcheck="false"></textarea>
`)
  .querySelector("#windpressoxygen-plc-input");

const textInputContainer = document.createElement("div");
textInputContainer.classList.add("windpressoxygen-plc-input-container");

textInputContainer.appendChild(textInput);

const containerAction = document
  .createRange()
  .createContextualFragment(/*html*/ `
    <div class="windpressoxygen-plc-action-container">
        <div class="actions">
        </div>
    </div>
`)
  .querySelector(".windpressoxygen-plc-action-container");
const containerActionButtons = containerAction.querySelector(".actions");

const classSortButton = document
  .createRange()
  .createContextualFragment(/*html*/ `
    <span id="windpressoxygen-plc-class-sort" class="bricks-svg-wrapper windpressoxygen-plc-class-sort" data-balloon="Automatic Class Sorting" data-balloon-pos="bottom-right">
        <svg  xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round" class="bricks-svg icon icon-tabler icons-tabler-outline icon-tabler-reorder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M10 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M17 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M5 11v-3a3 3 0 0 1 3 -3h8a3 3 0 0 1 3 3v3" /><path d="M16.5 8.5l2.5 2.5l2.5 -2.5" /></svg>    
    </span>
`)
  .querySelector("#windpressoxygen-plc-class-sort");
containerActionButtons.appendChild(classSortButton);

const visibleElementPanel = ref(false); // 0 = hidden, > 0 = visible
const activeElementId = ref(null);
const documentStore = bdeDocumentStore;
const globalStore = bdeGlobalStore;
const uiStore = bdeUiStore;
let isSyncingPlainClassesUpstream = false;
let syncingPlainClassesUpstreamTimeout = null;
const generatedOxygenSelectorIds = new Set();

let hit = null; // highlight any text except spaces and new lines

autosize(textInput);

let autocompleteItems = [];

wp.hooks.addAction("windpressoxygen-autocomplete-items-refresh", "windpressoxygen", () => {
  // wp hook filters. {value, color?, fontWeight?, namespace?}[]
  autocompleteItems = wp.hooks.applyFilters(
    "windpressoxygen-autocomplete-items",
    [],
    textInput.value,
  );
});

wp.hooks.doAction("windpressoxygen-autocomplete-items-refresh");

const tribute = new Tribute({
  menuContainer: document.querySelector("#app"),

  containerClass: "windpressoxygen-tribute-container",

  autocompleteMode: true,

  // Limits the number of items in the menu
  menuItemLimit: 50,

  noMatchTemplate: "",

  values: async function (text, cb) {
    const filters = await wp.hooks.applyFilters(
      "windpressoxygen-autocomplete-items-query",
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

activeElementId.value = uiStore.activeElementId;
visibleElementPanel.value = isElementPropertiesPanelOpen();

uiStore.$onAction(({ name, args, after }) => {
  if (name === "activateElement" || name === "activateElementMutation") {
    activeElementId.value = args[0];
  }

  if (name === "setLeftSidebarState" || name === "setRightSidebarState") {
    visibleElementPanel.value = args[0] === "elementproperties" ? true : false;
  }

  if (name === "setPanelState") {
    after(() => {
      visibleElementPanel.value = isElementPropertiesPanelOpen();
      queueMountTextInput();
    });
  }
});

documentStore.$onAction(({ name, args, after }) => {
  if (!isClassChangeAction(name, args[0])) {
    return;
  }

  after(() => {
    if (isSyncingPlainClassesUpstream) {
      return;
    }

    classDownstream();
    onTextInputChanges();
    queueMountTextInput();
  });
});

globalStore.$onAction(({ name, after }) => {
  if (name !== "setOxygenSelectors") {
    return;
  }

  after(() => {
    if (isSyncingPlainClassesUpstream) {
      return;
    }

    classDownstream();
    onTextInputChanges();
    queueMountTextInput();
  });
});

watch([activeElementId, visibleElementPanel], (newVal, oldVal) => {
  if (!oldVal || newVal[0] !== oldVal[0]) {
    nextTick(() => {
      classDownstream();
      onTextInputChanges();
    });
  }

  if (newVal[0]) {
    queueMountTextInput();
  }
}, { immediate: true });

const observerElementPanel = new MutationObserver(() => {
  if (!syncActiveElementId()) {
    return;
  }

  mountTextInput();
});

observerElementPanel.observe(document.querySelector("#app"), {
  childList: true,
  subtree: true,
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
  const classes = getActiveElementClassNames().join(" ");

  if (textInput.value !== classes) {
    textInput.value = classes;
  }
}

async function checkUpstreamPath() {
  return getActiveElement() !== null;
}

// Keep typing responsive while avoiding excessive Oxygen selector churn.
const debouncedClassUpstream = debounce(classUpstream, 250);

async function classUpstream() {
  if (!(await checkUpstreamPath())) {
    logger("Upstream path not found!", { module: "plain-classes", type: "error" });
    return;
  }

  // bring back the focus to the input
  textInput.focus();

  beginPlainClassesUpstreamSync();

  try {
    const classes = getClassNamesFromInput();
    const classIds = getOxygenSelectorIds(classes);

    await documentStore.unthrottledPropertyChanged({
      elementId: activeElementId.value,
      path: "meta.classes",
      value: classIds,
      meta: { snapshotLabel: "Update plain classes" },
    });

    pruneUnusedGeneratedOxygenSelectors();

    queueMountTextInput();
  } finally {
    finishPlainClassesUpstreamSync();
  }

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
    menuAutocompleteItemeEl = document.querySelector(".windpressoxygen-tribute-container>ul");
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
  const elementNode = bdeIframeCanvas.querySelector(`[data-node-id="${activeElementId.value}"]`);
  if (!elementNode) {
    return;
  }

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
  const elementNode = bdeIframeCanvas.querySelector(`[data-node-id="${activeElementId.value}"]`);
  if (!elementNode) {
    return;
  }

  if (elementNode.dataset.tributeClassName) {
    elementNode.classList.remove(elementNode.dataset.tributeClassName);
    elementNode.dataset.tributeClassName = "";
  }
}

function getActiveElement() {
  return documentStore.document.tree._lookupTable[syncActiveElementId()] || null;
}

function getActiveElementClassNames() {
  const activeElement = getActiveElement();

  return (activeElement?.data?.properties?.meta?.classes || []).map((classId) => {
    return getOxygenSelectorById(classId)?.name || classId;
  });
}

function getClassNamesFromInput() {
  return [...new Set(textInput.value.trim().split(/\s+/).filter(Boolean))];
}

function getOxygenSelectorById(classId) {
  return globalStore.oxySelectors.find((selector) => selector.id === classId);
}

function getOxygenSelectorIds(classNames) {
  const existingSelectors = new Map(
    globalStore.oxySelectors.map((selector) => [selector.name, selector]),
  );
  const newSelectors = [];

  const classIds = classNames.map((className) => {
    let selector = existingSelectors.get(className);

    if (!selector) {
      selector = {
        id: crypto.randomUUID(),
        name: className,
        children: [],
        locked: false,
        collection: "Default",
        type: "class",
      };
      generatedOxygenSelectorIds.add(selector.id);
      existingSelectors.set(className, selector);
      newSelectors.push(selector);
    }

    return selector.id;
  });

  if (newSelectors.length > 0) {
    globalStore.setOxygenSelectors([...globalStore.oxySelectors, ...newSelectors]);
  }

  return classIds;
}

function pruneUnusedGeneratedOxygenSelectors() {
  if (generatedOxygenSelectorIds.size === 0) {
    return;
  }

  const usedSelectorIds = getUsedOxygenSelectorIds();
  const staleSelectorIds = new Set(
    [...generatedOxygenSelectorIds].filter((selectorId) => !usedSelectorIds.has(selectorId)),
  );

  if (staleSelectorIds.size === 0) {
    return;
  }

  staleSelectorIds.forEach((selectorId) => generatedOxygenSelectorIds.delete(selectorId));

  const selectors = globalStore.oxySelectors.filter((selector) => {
    return !staleSelectorIds.has(selector.id);
  });

  if (selectors.length !== globalStore.oxySelectors.length) {
    globalStore.setOxygenSelectors(selectors);
  }
}

function getUsedOxygenSelectorIds() {
  const selectorIds = new Set();

  Object.values(documentStore.document.tree._lookupTable || {}).forEach((element) => {
    (element?.data?.properties?.meta?.classes || []).forEach((selectorId) => {
      selectorIds.add(selectorId);
    });
  });

  return selectorIds;
}

function queueMountTextInput() {
  nextTick(() => {
    mountTextInput();
    setTimeout(mountTextInput, 100);
    setTimeout(mountTextInput, 300);
  });
}

function mountTextInput() {
  if (!syncActiveElementId()) {
    return;
  }

  const classSelectorEl = document.querySelector(
    ".breakdance-element-properties-panel .oxy-class-selector",
  );

  if (!classSelectorEl) {
    return;
  }

  if (classSelectorEl.nextElementSibling !== textInputContainer) {
    classSelectorEl.insertAdjacentElement("afterend", textInputContainer);
  }
}

function isClassChangeAction(name, payload) {
  const classChangeActions = [
    "propertyChangedMutation",
    "throttledPropertyChanged",
    "unthrottledPropertyChanged",
  ];

  if (!classChangeActions.includes(name)) {
    return false;
  }

  return payload?.elementId === activeElementId.value && payload?.path === "meta.classes";
}

function isElementPropertiesPanelOpen() {
  return [
    uiStore.panelState.leftSidebarPanel,
    uiStore.panelState.rightSidebarPanel,
  ].includes("elementproperties");
}

function syncActiveElementId() {
  if (uiStore.activeElementId !== activeElementId.value) {
    activeElementId.value = uiStore.activeElementId;
  }

  return activeElementId.value;
}

function beginPlainClassesUpstreamSync() {
  isSyncingPlainClassesUpstream = true;

  if (syncingPlainClassesUpstreamTimeout !== null) {
    clearTimeout(syncingPlainClassesUpstreamTimeout);
  }
}

function finishPlainClassesUpstreamSync() {
  syncingPlainClassesUpstreamTimeout = setTimeout(() => {
    isSyncingPlainClassesUpstream = false;
    syncingPlainClassesUpstreamTimeout = null;
  }, 100);
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
