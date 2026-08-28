import { set } from "lodash-es";
import Fuse from "fuse.js";
import postcss from "postcss";
import { doComplete } from "tailwindcss-language-service";
import { decodeVFSContainer } from "@/packages/core/tailwindcss";
import { getTextDocument, stateFromConfig } from "../intellisense";
import { resolveConfig } from "../resolve-config";
import { createContext } from "tailwindcss3/src/lib/setupContextUtils";
import evaluateTailwindFunctions from "tailwindcss3/src/lib/evaluateTailwindFunctions";
import { bigSign } from "@/packages/core/tailwindcss/intellisense";
import { addPixelEquivalentsToValue } from "@/packages/core/tailwindcss-v3/intellisense";
import { generateRules as twGenerateRules } from "tailwindcss3/src/lib/generateRules";

let classLists = [];

const channel = new BroadcastChannel("windpress");

const vfsContainer = document.querySelector('script#windpress\\:vfs[type="text/plain"]');

if (vfsContainer) {
  initListener();

  const vfsObserver = new MutationObserver(async () => {
    await preloadItems();
  });

  vfsObserver.observe(vfsContainer, {
    characterData: true,
    subtree: true,
  });
}

async function preloadItems() {
  const volume = decodeVFSContainer(vfsContainer.textContent);

  const resolvedConfig = await resolveConfig(volume);

  const textDocument = getTextDocument(`<div class=""></div>`);

  const state = stateFromConfig(resolvedConfig);

  const position = { character: 12, line: 0 };

  const results = (await doComplete(state, textDocument, position)).items.map((item) => {
    return {
      value: item.label,
      color: typeof item.documentation === "string" ? item.documentation : null,
      isVariant: item.data._type === "variant",
    };
  });

  classLists = results;

  channel.postMessage({
    source: "windpress/intellisense",
    target: "any",
    task: `windpress.code-editor.saved.done`,
  });
}

// Ensure the items generated once (on load)
await preloadItems();

export function initListener() {
  channel.addEventListener("message", async (e) => {
    const data = e.data;
    const source = "windpress/dashboard";
    const target = "windpress/observer";
    const task = "windpress.code-editor.saved";

    if (data.source === source && data.target === target && data.task === task) {
      await preloadItems();
    }
  });
}

async function searchClassList(query) {
  // if the query is empty, return all classList
  if (query === "") {
    return classLists;
  }

  // split query by `:` and search for each subquery
  const segment = query.split(":");
  const prefix = segment.slice(0, -1).join(":");
  let q = segment.pop();

  // if `!` exists as the first character on the query, cut it and mark as important
  let importantModifier = "";
  if (q.startsWith("!")) {
    q = q.slice(1);
    importantModifier = "!";
  }

  // check if opacity modifier is used, for example `bg-red-500/20`. the opacity modifier is a number between 0 and 100
  let opacityModifier = false;
  if (q.includes("/")) {
    const [_q, opacity] = q.split("/");
    // if the opacity modifier is not a number between 0 and 100, revert back the split
    if (opacity === "") {
      q = _q;
      opacityModifier = opacity;
    } else if (isNaN(opacity) || opacity < 0 || opacity > 100) {
      q = [_q, opacity].join("/");
    } else {
      q = _q;
      opacityModifier = parseInt(opacity);
    }
  }

  let filteredClassList = classLists.filter((classList) => classList.value.includes(q));

  // if opacityModifier is not false, populate the filteredClassList with the opacityModifier (1 to 100)
  if (opacityModifier !== false) {
    const tempFilteredClassList = [];

    const loopIncrement = opacityModifier === "" ? 5 : 1;
    const loopStart =
      opacityModifier === "" || opacityModifier > 9
        ? 0
        : Math.floor((opacityModifier * 10 + 1) / 10) * 10;
    const loopEnd =
      opacityModifier === "" || opacityModifier > 9
        ? 100
        : Math.ceil((opacityModifier * 10 + 1) / 10) * 10;

    filteredClassList.forEach((classList) => {
      for (let i = loopStart; i <= loopEnd; i += loopIncrement) {
        tempFilteredClassList.push({
          ...classList,
          value: classList.value + "/" + i,
        });
      }
    });

    filteredClassList = tempFilteredClassList;
  }

  const fuse = new Fuse(filteredClassList, {
    keys: ["value"],
    threshold: 0.4,
  });

  return fuse.search(q).map(({ item }) => {
    return {
      value: [prefix, (importantModifier ? "!" : "") + item.value].filter(Boolean).join(":"),
      color: item.color,
    };
  });
}

async function classnameToCss(input) {
  const classes = input.split(/\s+/).filter((x) => x !== "" && x !== "|");

  const volume = decodeVFSContainer(vfsContainer.textContent);

  const resolvedConfig = await resolveConfig(volume);

  const context = createContext(resolvedConfig);

  const css = classes
    .map((className) => generate(className, context))
    .filter((x) => x !== null)
    .map((value) => addPixelEquivalentsToValue(value, 16));

  return Array.isArray(css) ? css.join(" ") : css;
}

function generate(className, context) {
  if (className === null) return null;

  const { root, rules } = generateRules([className], context);

  if (rules.length === 0) {
    return null;
  }

  return stringifyRoot(root);
}

function generateRules(classNames, context, filter = () => true) {
  const rules = twGenerateRules(new Set(classNames), context).sort(([a], [z]) => bigSign(a - z));

  const root = postcss.root({ nodes: rules.map(([, rule]) => rule) });

  evaluateTailwindFunctions(context)(root);

  const actualRules = [];
  root.walkRules((subRule) => {
    if (filter(subRule)) {
      actualRules.push(subRule);
    }
  });

  return {
    root,
    rules: actualRules,
  };
}

function stringifyRoot(root) {
  const clone = root.clone();

  clone.walkAtRules("defaults", (node) => {
    node.remove();
  });

  return clone
    .toString()
    .replace(/([^;{}\s])(\n\s*})/g, (_match, before, after) => `${before};${after}`);
}

function prefixCandidate(context, selector) {
  const prefix = context.tailwindConfig.prefix;

  return typeof prefix === "function" ? prefix(selector) : prefix + selector;
}

function getClassOrderPolyfill(classes, context) {
  const parasiteUtilities = new Set([
    prefixCandidate(context, "group"),

    prefixCandidate(context, "peer"),
  ]);

  const classNamesWithOrder = [];

  for (const className of classes) {
    let order =
      twGenerateRules(new Set([className]), context).sort(([a], [z]) => bigSign(z - a))[0]?.[0] ??
      null;

    if (order === null && parasiteUtilities.has(className)) {
      order = context.layerOrder.components;
    }

    classNamesWithOrder.push([className, order]);
  }

  return classNamesWithOrder;
}

async function classSorter(classes) {
  const volume = decodeVFSContainer(vfsContainer.textContent);

  const parts = classes.split(/\s+/).filter((x) => x !== "" && x !== "|");

  const unknownClassNames = [];

  const resolvedConfig = await resolveConfig(volume);

  const context = createContext(resolvedConfig);

  const knownClassNamesWithOrder = context.getClassOrder
    ? context.getClassOrder(parts)
    : getClassOrderPolyfill(parts, context);

  const knownClassNames = knownClassNamesWithOrder
    .sort(([, a], [, z]) => {
      if (a === z) return 0;

      if (a === null) return -1;

      if (z === null) return 1;

      return bigSign(a - z);
    })
    .map(([className]) => className);

  return [...unknownClassNames, ...knownClassNames].join(" ");
}

set(window, "windpress.module.classSorter.sort", async (input) => classSorter(input));
set(window, "windpress.module.classnameToCss.generate", async (input) => classnameToCss(input));
set(window, "windpress.module.autocomplete.query", (q) => searchClassList(q));
