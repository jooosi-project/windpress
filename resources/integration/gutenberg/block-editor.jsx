import "./block-editor.scss";

import tippy, { followCursor } from "tippy.js";
import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

import { __ } from "@wordpress/i18n";
import { InspectorControls } from "@wordpress/block-editor";
import { PanelBody, PanelRow, TextareaControl, Button } from "@wordpress/components";
import autosize from "autosize";
import Tribute from "tributejs";
import { debounce } from "lodash-es";

import HighlightInTextarea from "@/integration/library/highlight-in-textarea.js";

import { useEffect } from "react";
import { nextTick, ref, watch } from "vue";

let shikiHighlighter = null;

const WindPressIcon = (props) => {
  return (
    <IconWindpressWindpress {...props} width={20} height={20} aria-hidden="true" focusable="false" />
  );
};

(async () => {
  shikiHighlighter = await createHighlighterCore({
    themes: [import("shiki/themes/dark-plus.mjs"), import("shiki/themes/light-plus.mjs")],
    langs: [import("shiki/langs/css.mjs")],
    engine: createOnigurumaEngine(import("shiki/wasm")),
  });
})();

const textInputRef = ref(null);

let hit = null;

let autocompleteItems = [];

wp.hooks.addAction("windpressgutenberg-autocomplete-items-refresh", "windpressgutenberg", () => {
  // wp hook filters. {value, color?, fontWeight?, namespace?}[]
  autocompleteItems = wp.hooks.applyFilters("windpressgutenberg-autocomplete-items", [], "");
});

wp.hooks.doAction("windpressgutenberg-autocomplete-items-refresh");

const tribute = new Tribute({
  containerClass: "windpressgutenberg-tribute-container",

  autocompleteMode: true,

  // Limits the number of items in the menu
  menuItemLimit: 50,

  noMatchTemplate: "",

  values: async function (text, cb) {
    const filters = await wp.hooks.applyFilters(
      "windpressgutenberg-autocomplete-items-query",
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
    const generatedCssCode = await window.windpress.module.classnameToCss.generate(classname);
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

const currentBlockId = ref(null);
const latestClasses = ref(null);
const latestTributeClassName = ref(null);

function previewTributeEventCallbackUpDown() {
  let li = tribute.menu.querySelector("li.highlight>span.class-name");

  if (latestTributeClassName.value) {
    previewResetClass(latestTributeClassName.value);
  }

  latestTributeClassName.value = li.dataset.tributeClassName;

  previewAddClass(li.dataset.tributeClassName);
}

let menuAutocompleteItemeEl = null;
const observerAutocomplete = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        const className = node.querySelector(".class-name").dataset.tributeClassName;

        node.addEventListener("mouseenter", (e) => {
          previewAddClass(className);
        });

        node.addEventListener("mouseleave", (e) => {
          previewResetClass(className);
        });

        node.addEventListener(
          "click",
          (e) => {
            // previewResetClass();
          },
          { capture: true },
        );
      });
    }
  });
});

function getContentDocument() {
  const rootContainer = document.querySelector('iframe[name="editor-canvas"]');
  const contentWindow = rootContainer?.contentWindow || rootContainer;
  return rootContainer?.contentDocument || contentWindow?.document;
}

function previewAddClass(className) {
  const contentDocument = getContentDocument();
  if (!contentDocument) {
    return;
  }

  const block = contentDocument.getElementById(`block-${currentBlockId.value}`);

  if (block) {
    block.classList.add(className);
  }
}

function previewResetClass(className) {
  const contentDocument = getContentDocument();
  if (!contentDocument) {
    return;
  }

  const block = contentDocument.getElementById(`block-${currentBlockId.value}`);

  if (block && latestClasses.value && !latestClasses.value.includes(className)) {
    block.classList.remove(className);
  }
}

watch(textInputRef, (newVal, oldVal) => {
  if (newVal) {
    autosize(textInputRef.value);
    tribute.attach(textInputRef.value);
    // delay for 10ms
    setTimeout(() => {
      hit = new HighlightInTextarea(textInputRef.value, {
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

      hoverPreviewProvider();

      textInputRef.value.addEventListener("highlights-updated", function (e) {
        hoverPreviewProvider();
      });

      textInputRef.value.addEventListener("tribute-active-true", function (e) {
        if (menuAutocompleteItemeEl === null) {
          menuAutocompleteItemeEl = document.querySelector(
            ".windpressgutenberg-tribute-container>ul",
          );
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

      textInputRef.value.addEventListener("tribute-active-false", function (e) {
        if (latestTributeClassName.value) {
          previewResetClass(latestTributeClassName.value);
        }
      });

      nextTick(() => {
        onTextInputChanges();
      });
    }, 10);
  }
});

function onTextInputChanges() {
  nextTick(() => {
    try {
      hit.handleInput();
    } catch (error) {}
    autosize.update(textInputRef.value);
    // tribute.setMenuContainer(document.querySelector('div.hit-container'));
    tribute.hideMenu();
  });
}

function addClassInspectorControls(BlockEdit) {
  return (props) => {
    const { name, clientId, attributes, setAttributes } = props;

    useEffect(() => {
      currentBlockId.value = clientId;
      latestClasses.value = attributes.className;
    });

    function handleValueChange(value) {
      setAttributes({ className: value });
      latestClasses.value = value;
    }

    async function handleAutomaticClassSorting() {
      const sortedClasses = await windpress.module.classSorter.sort(attributes.className);

      setAttributes({ className: sortedClasses });
      latestClasses.value = sortedClasses;

      onTextInputChanges();
    }

    return (
      <>
        <BlockEdit {...props} />
        <InspectorControls>
          <PanelBody title={__("WindPress", "windpress")} icon={WindPressIcon} initialOpen={true}>
            <PanelRow className="windpressgutenberg-actions">
              <div>
                <Button
                  showTooltip
                  variant="secondary"
                  label={__("Automatic Class Sorting", "windpress")}
                  onClick={handleAutomaticClassSorting}
                >
                  <IconTablerReorder width={24} height={24} aria-hidden="true" />
                </Button>
              </div>
            </PanelRow>
            <TextareaControl
              __nextHasNoMarginBottom
              value={attributes.className}
              onChange={(value) => handleValueChange(value)}
              onInput={(e) => handleValueChange(e.target.value)}
              ref={(el) => (textInputRef.value = el)}
            />
          </PanelBody>
        </InspectorControls>
      </>
    );
  };
}

(() => {
  wp.hooks.addFilter(
    "editor.BlockEdit",
    "windpress/add-class-inspector-controls",
    addClassInspectorControls,
  );
})();
