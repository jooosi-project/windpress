/**
 * @module variables
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Register the variables entry to the Oxygen editor.
 */

import { bdeGlobalStore, bdeIframe } from "@/integration/oxygen/constant.js";
import { getVariableList, decodeVFSContainer, loadDesignSystem } from "@/packages/core/tailwindcss";
import { logger } from "@/integration/common/logger";

const WINDPRESS_COLLECTION = "WindPress";
const WINDPRESS_VARIABLE_ID_PREFIX = "windpress-";
const MOUNT_RETRY_LIMIT = 10;
const MOUNT_RETRY_DELAY = 500;
const COLOR_VALUE_PATTERN = /^(#|rgb\(|rgba\(|hsl\(|hsla\(|hwb\(|lab\(|lch\(|oklab\(|oklch\(|color\(|color-mix\()/i;
const IMAGE_URL_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|#|$)/i;
const UNIT_VALUE_PATTERN = /^(-?\d*\.?\d+)(px|r?em|%|vw|vh|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|ch|ex|lh|rlh|cqw|cqh|cqi|cqb|cqmin|cqmax|cm|mm|q|in|pc|pt|fr|deg|grad|rad|turn|s|ms|hz|khz|dpi|dpcm|dppx)$/i;

interface WindPressVariable {
  key: string;
  value: string;
  index: number;
}

interface WindPressVariableEntry {
  key: string;
  value: string | null;
  index: number;
}

type OxygenVariableType = "color"
  | "number"
  | "unit"
  | "font_family"
  | "image_url"
  | "url"
  | "custom";

interface OxygenVariable {
  id: string;
  type: OxygenVariableType;
  label: string;
  cssVariableName: string;
  collection: string;
  value: OxygenVariableValue;
}

interface OxygenUnitValue {
  number: number | string;
  unit: string;
  style: string;
}

type OxygenVariableValue = string | OxygenUnitValue;

interface OxygenGlobalStore {
  variables: OxygenVariable[];
  variablesCollections: string[];
  variablesHasUnsavedChangesPresent: boolean;
  setVariables: (variables: OxygenVariable[]) => void;
  setVariablesCollections: (collections: string[]) => void;
  markCurrentVariablesAsUntouched: () => void;
  $onAction: (callback: (context: {
    name: string;
    after: (callback: () => void) => void;
  }) => void) => void;
  $subscribe: (callback: () => void) => void;
}

interface BreakdanceHistoryManager {
  ignore: (callback: () => void) => void;
}

let cachedVariableLists: WindPressVariable[] = [];
let mountVariablesTimeout: ReturnType<typeof setTimeout> | undefined;
let registerVariablesTimeout: ReturnType<typeof setTimeout> | undefined;
let isRegisteringVariables = false;
let breakdanceHistoryManagerPromise: Promise<BreakdanceHistoryManager | null> | undefined;

async function getWindPressVariables(): Promise<WindPressVariable[]> {
  const currentVfsContainerText = bdeIframe.contentWindow.document.querySelector(
    'script#windpress\\:vfs[type="text/plain"]',
  )?.textContent;

  if (!currentVfsContainerText) {
    return [];
  }

  const volume = decodeVFSContainer(currentVfsContainerText);

  return (await getVariableList(
    await loadDesignSystem({ volume: getVariableRegistrationVolume(volume) }),
  )).filter(hasVariableValue);
}

function getVariableRegistrationVolume(volume: Record<string, string>) {
  return Object.fromEntries(Object.entries(volume).map(([path, content]) => {
    if (!path.endsWith(".css")) {
      return [path, content];
    }

    return [path, content.replace(/--\s*\*\s*:\s*initial\s*;/g, "")];
  }));
}

function hasVariableValue(variable: WindPressVariableEntry): variable is WindPressVariable {
  return typeof variable.value === "string";
}

function mountVariablesStylesheet(variableLists: WindPressVariable[]) {
  let css = "";
  variableLists.forEach((variable) => {
    css += `--${variable.key.substring(2)}: ${variable.value};\n`;
  });

  css = `@layer base { :root { ${css} } }`;

  // top window
  let topStyle;

  if (document.head.querySelector("style#windpress-variables")) {
    topStyle = document.head.querySelector("style#windpress-variables");
  } else {
    topStyle = document.createElement("style");
    topStyle.id = "windpress-variables";
    document.head.appendChild(topStyle);
  }
  if (topStyle) {
    topStyle.textContent = css;
  }

  // iframe window
  let iframeStyle;
  if (bdeIframe.contentWindow.document.head.querySelector("style#windpress-variables")) {
    iframeStyle = bdeIframe.contentWindow.document.head.querySelector("style#windpress-variables");
  } else {
    iframeStyle = bdeIframe.contentWindow.document.createElement("style");
    iframeStyle.id = "windpress-variables";
    bdeIframe.contentWindow.document.head.appendChild(iframeStyle);
  }
  if (iframeStyle) {
    iframeStyle.textContent = css;
  }
}

function buildOxygenVariables(variableLists: WindPressVariable[]) {
  return variableLists.map((variable) => {
    const name = variable.key.substring(2);
    const type = getOxygenVariableType(name, variable.value);

    return {
      id: `${WINDPRESS_VARIABLE_ID_PREFIX}${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
      type,
      label: name,
      cssVariableName: name,
      collection: WINDPRESS_COLLECTION,
      value: getOxygenVariableValue(type, variable.value),
    } satisfies OxygenVariable;
  });
}

function getOxygenVariableValue(type: OxygenVariableType, value: string): OxygenVariableValue {
  if (type === "unit") {
    return getOxygenUnitValue(value) ?? value;
  }

  return value;
}

function getOxygenVariableType(name: string, value: string): OxygenVariableType {
  if (isColorVariable(name, value)) {
    return "color";
  }

  if (isFontFamilyVariable(name)) {
    return "font_family";
  }

  if (isImageUrlValue(value)) {
    return "image_url";
  }

  if (isUrlValue(value)) {
    return "url";
  }

  if (isNumberValue(value)) {
    return "number";
  }

  if (isUnitValue(value)) {
    return "unit";
  }

  return "custom";
}

function isColorVariable(name: string, value: string) {
  return name.startsWith("color-")
    || COLOR_VALUE_PATTERN.test(value.trim())
    || ["transparent", "currentcolor", "currentColor"].includes(value.trim());
}

function isFontFamilyVariable(name: string) {
  return name.startsWith("font-") && !name.startsWith("font-weight-");
}

function isImageUrlValue(value: string) {
  const url = normalizeUrlValue(value);

  return /^data:image\//i.test(url) || IMAGE_URL_PATTERN.test(url);
}

function isUrlValue(value: string) {
  return /^(url\(|https?:\/\/|\/\/|data:|blob:)/i.test(value.trim());
}

function normalizeUrlValue(value: string) {
  return value.trim().replace(/^url\((.*)\)$/i, "$1").replace(/^['"]|['"]$/g, "");
}

function isNumberValue(value: string) {
  return /^-?\d*\.?\d+$/.test(value.trim());
}

function isUnitValue(value: string) {
  return UNIT_VALUE_PATTERN.test(value.trim());
}

function getOxygenUnitValue(value: string): OxygenUnitValue | null {
  const normalizedValue = value.trim();
  const match = normalizedValue.match(UNIT_VALUE_PATTERN);

  if (!match) {
    return null;
  }

  return {
    number: Number(match[1]),
    unit: match[2],
    style: normalizedValue,
  };
}

function getBreakdanceStoreModuleUrl() {
  return performance.getEntriesByType("resource")
    .map((entry) => entry.name)
    .find((url) => /\/builder\/dist\/js\/store-[^/]+\.js(?:\?|$)/.test(url)) ?? null;
}

async function getBreakdanceHistoryManager(): Promise<BreakdanceHistoryManager | null> {
  if (!breakdanceHistoryManagerPromise) {
    breakdanceHistoryManagerPromise = (async () => {
      const storeModuleUrl = getBreakdanceStoreModuleUrl();

      if (!storeModuleUrl) {
        return null;
      }

      const storeModule = await import(/* @vite-ignore */ storeModuleUrl);

      return Object.values(storeModule).find((value): value is BreakdanceHistoryManager => {
        return typeof value === "object"
          && value !== null
          && typeof (value as BreakdanceHistoryManager).ignore === "function";
      }) ?? null;
    })();
  }

  return breakdanceHistoryManagerPromise;
}

async function registerVariables(variableLists: WindPressVariable[]) {
  const globalStore = bdeGlobalStore as OxygenGlobalStore | undefined;

  if (!globalStore || variableLists.length === 0) {
    return;
  }

  if (hasRegisteredVariables()) {
    return;
  }

  isRegisteringVariables = true;

  try {
    const wasDirty = globalStore.variablesHasUnsavedChangesPresent;
    const windPressVariables = buildOxygenVariables(variableLists);
    const variables = globalStore.variables.filter((variable) => {
      return !variable.id?.startsWith(WINDPRESS_VARIABLE_ID_PREFIX);
    });
    const collections = [...new Set([...globalStore.variablesCollections, WINDPRESS_COLLECTION])];
    const register = () => {
      globalStore.setVariables([...variables, ...windPressVariables]);
      globalStore.setVariablesCollections(collections);

      if (!wasDirty) {
        globalStore.markCurrentVariablesAsUntouched();
      }
    };
    const historyManager = await getBreakdanceHistoryManager();

    if (historyManager) {
      historyManager.ignore(register);
    } else {
      register();
    }
  } finally {
    isRegisteringVariables = false;
  }
}

function hasRegisteredVariables() {
  const globalStore = bdeGlobalStore as OxygenGlobalStore | undefined;

  if (!globalStore || cachedVariableLists.length === 0) {
    return true;
  }

  const registeredVariables = globalStore.variables.filter((variable) => {
    return variable.id?.startsWith(WINDPRESS_VARIABLE_ID_PREFIX);
  });
  const expectedVariables = buildOxygenVariables(cachedVariableLists);
  const registeredVariablesMap = new Map(registeredVariables.map((variable) => {
    return [variable.id, variable];
  }));

  return registeredVariables.length === expectedVariables.length
    && globalStore.variablesCollections.includes(WINDPRESS_COLLECTION)
    && expectedVariables.every((expectedVariable) => {
      const registeredVariable = registeredVariablesMap.get(expectedVariable.id);

      return registeredVariable?.type === expectedVariable.type
        && registeredVariable.label === expectedVariable.label
        && registeredVariable.cssVariableName === expectedVariable.cssVariableName
        && registeredVariable.collection === expectedVariable.collection
        && areOxygenVariableValuesEqual(registeredVariable.value, expectedVariable.value);
    });
}

function areOxygenVariableValuesEqual(currentValue: OxygenVariableValue, expectedValue: OxygenVariableValue) {
  if (typeof currentValue === "string" || typeof expectedValue === "string") {
    return currentValue === expectedValue;
  }

  return Number(currentValue.number) === Number(expectedValue.number)
    && currentValue.unit === expectedValue.unit
    && currentValue.style === expectedValue.style;
}

function queueRegisterVariables() {
  if (registerVariablesTimeout) {
    clearTimeout(registerVariablesTimeout);
  }

  registerVariablesTimeout = setTimeout(() => {
    if (isRegisteringVariables || hasRegisteredVariables()) {
      return;
    }

    void registerVariables(cachedVariableLists);
  }, 0);
}

function observeVariablesStore() {
  const globalStore = bdeGlobalStore as OxygenGlobalStore | undefined;

  if (!globalStore) {
    return;
  }

  globalStore.$onAction(({ name, after }) => {
    if (name !== "setVariables" && name !== "setVariablesCollections") {
      return;
    }

    after(() => {
      queueRegisterVariables();
    });
  });

  globalStore.$subscribe(() => {
    queueRegisterVariables();
  });
}

async function mountVariables(retries = 0) {
  const variableLists = await getWindPressVariables();

  if (variableLists.length === 0 && retries < MOUNT_RETRY_LIMIT) {
    if (mountVariablesTimeout) {
      clearTimeout(mountVariablesTimeout);
    }

    mountVariablesTimeout = setTimeout(() => {
      mountVariables(retries + 1);
    }, MOUNT_RETRY_DELAY);

    return;
  }

  if (variableLists.length === 0) {
    return;
  }

  cachedVariableLists = variableLists;

  mountVariablesStylesheet(variableLists);
  await registerVariables(variableLists);
}

const channel = new BroadcastChannel("windpress");
channel.addEventListener("message", async (e) => {
  const data = e.data;
  const dashboardSource = "windpress/dashboard";
  const intellisenseSource = "windpress/intellisense";
  const intellisenseTarget = "windpress/intellisense";
  const savedTask = "windpress.code-editor.saved";
  const savedDoneTask = "windpress.code-editor.saved.done";

  if (data.source === dashboardSource
    && data.target === intellisenseTarget
    && data.task === savedTask
  ) {
    setTimeout(() => {
      mountVariables();
    }, 1500);
  }

  if (data.source === intellisenseSource && data.task === savedDoneTask) {
    setTimeout(() => {
      mountVariables();
    }, 1000);
  }
});

observeVariablesStore();
mountVariables();

logger("Module loaded!", { module: "variables" });
