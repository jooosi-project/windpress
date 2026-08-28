/**
 * Highlight in Textarea
 * npm: highlight-in-textarea
 *
 * This library is a fork of the original highlight-in-textarea library.
 * Some undocumented modifications were made for the purpose of the use case in the WindPress plugin.
 */

function HighlightInTextarea(el, config) {
  this.init(el, config);
}

HighlightInTextarea.instance = function (el, config) {
  return new HighlightInTextarea(el, config);
};

HighlightInTextarea.prototype = {
  ID: "hit",

  init: function (el, config) {
    if (typeof el === "string") {
      this.el = document.querySelector(el);
    } else {
      this.el = el;
    }

    if (this.getType(config) === "custom") {
      this.highlight = config;
      this.generate();
    } else {
      console.error("valid config object not provided");
    }
  },

  // returns identifier strings that aren't necessarily "real" JavaScript types
  getType: function (instance) {
    let type = typeof instance;
    if (!instance) {
      return "falsey";
    } else if (Array.isArray(instance)) {
      if (
        instance.length === 2 &&
        typeof instance[0] === "number" &&
        typeof instance[1] === "number"
      ) {
        return "range";
      } else {
        return "array";
      }
    } else if (type === "object") {
      if (instance instanceof RegExp) {
        return "regexp";
      } else if (instance.hasOwnProperty("highlight")) {
        return "custom";
      }
    } else if (type === "function" || type === "string") {
      return type;
    }

    return "other";
  },

  generate: function () {
    this.el.classList.add(this.ID + "-input", this.ID + "-content");

    this.el.addEventListener("input", this.handleInput.bind(this));
    this.el.addEventListener("scroll", this.handleScroll.bind(this));

    this.highlights = document.createElement("div");
    this.highlights.classList.add(this.ID + "-highlights", this.ID + "-content");

    this.backdrop = document.createElement("div");
    this.backdrop.classList.add(this.ID + "-backdrop");
    this.backdrop.append(this.highlights);

    this.container = document.createElement("div");
    this.container.classList.add(this.ID + "-container");
    this.el.parentNode.insertBefore(this.container, this.el.nextSibling);

    this.container.append(this.backdrop);
    this.container.append(this.el); // moves el into container

    this.container.addEventListener("scroll", this.blockContainerScroll.bind(this));

    // trigger input event to highlight any existing input
    this.handleInput();
  },

  handleInput: function () {
    let input = this.el.value;
    let ranges = this.getRanges(input, this.highlight);
    let unstaggeredRanges = this.removeStaggeredRanges(ranges);
    let boundaries = this.getBoundaries(unstaggeredRanges);
    this.renderMarks(boundaries);
  },

  getRanges: function (input, highlight) {
    let type = this.getType(highlight);
    switch (type) {
      case "array":
        return this.getArrayRanges(input, highlight);
      case "function":
        return this.getFunctionRanges(input, highlight);
      case "regexp":
        return this.getRegExpRanges(input, highlight);
      case "string":
        return this.getStringRanges(input, highlight);
      case "range":
        return this.getRangeRanges(input, highlight);
      case "custom":
        return this.getCustomRanges(input, highlight);
      default:
        if (!highlight) {
          // do nothing for falsey values
          return [];
        } else {
          console.error("unrecognized highlight type");
        }
    }
  },

  getArrayRanges: function (input, arr) {
    let ranges = arr.map(this.getRanges.bind(this, input));
    return Array.prototype.concat.apply([], ranges);
  },

  getFunctionRanges: function (input, func) {
    return this.getRanges(input, func(input));
  },

  getRegExpRanges: function (input, regex) {
    let ranges = [];
    let match;
    while (((match = regex.exec(input)), match !== null)) {
      ranges.push([match.index, match.index + match[0].length]);
      if (!regex.global) {
        // non-global regexes do not increase lastIndex, causing an infinite loop,
        // but we can just break manually after the first match
        break;
      }
    }
    return ranges;
  },

  getStringRanges: function (input, str) {
    let ranges = [];
    let inputLower = input.toLowerCase();
    let strLower = str.toLowerCase();
    let index = 0;
    while (((index = inputLower.indexOf(strLower, index)), index !== -1)) {
      ranges.push([index, index + strLower.length]);
      index += strLower.length;
    }
    return ranges;
  },

  getRangeRanges: function (input, range) {
    return [range];
  },

  getCustomRanges: function (input, custom) {
    let ranges = this.getRanges(input, custom.highlight);
    if (custom.className) {
      ranges.forEach(function (range) {
        // persist class name as a property of the array
        if (range.className) {
          range.className = custom.className + " " + range.className;
        } else {
          range.className = custom.className;
        }
      });
    }
    if (custom.blank) {
      ranges.forEach(function (range) {
        range.blank = custom.blank;
      });
    }

    return ranges;
  },

  // prevent staggered overlaps (clean nesting is fine)
  removeStaggeredRanges: function (ranges) {
    let unstaggeredRanges = [];
    ranges.forEach(function (range) {
      let isStaggered = unstaggeredRanges.some(function (unstaggeredRange) {
        let isStartInside = range[0] > unstaggeredRange[0] && range[0] < unstaggeredRange[1];
        let isStopInside = range[1] > unstaggeredRange[0] && range[1] < unstaggeredRange[1];
        return isStartInside !== isStopInside; // xor
      });
      if (!isStaggered) {
        unstaggeredRanges.push(range);
      }
    });
    return unstaggeredRanges;
  },

  getBoundaries: function (ranges) {
    let boundaries = [];
    ranges.forEach(function (range) {
      boundaries.push({
        type: "start",
        index: range[0],
        className: range.className,
        blank: range.blank,
      });
      boundaries.push({
        type: "stop",
        index: range[1],
      });
    });

    this.sortBoundaries(boundaries);
    return boundaries;
  },

  sortBoundaries: function (boundaries) {
    // backwards sort (since marks are inserted right to left)
    boundaries.sort(function (a, b) {
      if (a.index !== b.index) {
        return b.index - a.index;
      } else if (a.type === "stop" && b.type === "start") {
        return 1;
      } else if (a.type === "start" && b.type === "stop") {
        return -1;
      } else {
        return 0;
      }
    });
  },

  renderMarks: function (boundaries) {
    let input = this.el.value;
    const originalInput = input;
    boundaries.forEach(function (boundary, index) {
      let markup;
      if (boundary.type === "start") {
        markup = "{{hit-mark-start|" + index + "}}";
      } else {
        markup = "{{hit-mark-stop}}";
      }
      input = input.slice(0, boundary.index) + markup + input.slice(boundary.index);
    });

    // this keeps scrolling aligned when input ends with a newline
    // input = input.replace(/\n({{hit-mark-stop}})?$/, '\n\n$1');
    input = input.replace(/\n({{hit-mark-stop}})?$/, "\n$1");

    // encode HTML entities
    input = input.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // replace start tokens with opening <mark> tags with class name
    input = input.replace(/{{hit-mark-start\|(\d+)}}/g, function (match, subMatch) {
      const className = boundaries[+subMatch].className;
      if (className) {
        let openMark = '<mark class="' + className + '"';
        if (className === "word") {
          let dw = originalInput.slice(
            boundaries[+subMatch].index,
            boundaries[+subMatch - 1].index,
          );
          dw = dw.replace(/"/g, "&quot;");
          openMark += ' data-word="' + dw + '"';
        }
        return openMark + ">";
      } else {
        return "<mark>";
      }
    });

    // replace stop tokens with closing </mark> tags
    input = input.replace(/{{hit-mark-stop}}/g, "</mark>");

    input += '<mark class="placeholder"> ⚡ windpress </mark>';

    this.highlights.innerHTML = input;

    // trigger a custom event to notify the listener that the highlights have been updated
    this.el.dispatchEvent(new CustomEvent("highlights-updated"));
  },

  handleScroll: function () {
    this.backdrop.scrollTop = this.el.scrollTop;

    // Chrome and Safari won't break long strings of spaces, which can cause
    // horizontal scrolling, this compensates by shifting highlights by the
    // horizontally scrolled amount to keep things aligned
    let scrollLeft = this.el.scrollLeft;

    if (scrollLeft > 0) {
      this.backdrop.style.transform = "translateX(" + -scrollLeft + "px)";
    } else {
      this.backdrop.style.transform = "";
    }
  },

  // in Chrome, page up/down in the textarea will shift stuff within the
  // container (despite the CSS), this immediately reverts the shift
  blockContainerScroll: function () {
    this.container.scrollLeft = 0;
  },

  destroy: function () {
    this.container.parentElement.replaceChild(this.el, this.container);
    this.el.classList.remove(this.ID + "-content", this.ID + "-input");
  },
};

export default HighlightInTextarea;
