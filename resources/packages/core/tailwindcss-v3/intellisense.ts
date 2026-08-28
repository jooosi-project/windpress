import postcss from "postcss";
import postcssSelectorParser from "postcss-selector-parser";
import parseValue from "postcss-value-parser";
import { createContext } from "tailwindcss3/src/lib/setupContextUtils.js";
import { getColor } from "tailwindcss-language-service";
import expandApplyAtRules from "tailwindcss3/src/lib/expandApplyAtRules.js";
import { generateRules } from "tailwindcss3/src/lib/generateRules.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { splitAtTopLevelOnly } from "tailwindcss3/src/util/splitAtTopLevelOnly.js";

const DEFAULT_URI = "";
const DEFAULT_LANGUAGE_ID = "html";

/**
 *
 * @param {string} textData
 * @param {string} uri
 * @param {*} languageId
 * @returns {TextDocument}
 */
export const getTextDocument = (textData, uri = DEFAULT_URI, languageId = DEFAULT_LANGUAGE_ID) =>
  TextDocument.create(uri, languageId, 1, textData);

/**
 *
 * @param {string} input
 * @param {string} separator
 * @returns {string[]}
 */
export const splitClassWithSeparator = (input, separator = ":") => {
  if (input === "*") {
    return ["*"];
  }

  return splitAtTopLevelOnly(input, separator);
};

export function stateFromConfig(resolvedConfig, version = "3.0.0") {
  const jitContext = createContext(resolvedConfig);

  const state = {
    version,
    resolvedConfig,
    enabled: true,
    modules: {
      postcss: {
        module: postcss,
        version: "",
      },
      postcssSelectorParser: { module: postcssSelectorParser },
      jit: {
        createContext: { module: createContext },
        expandApplyAtRules: { module: expandApplyAtRules },
        generateRules: { module: generateRules },
      },
    },
    classNames: {
      classNames: {},
      context: {},
    },
    jit: true,
    jitContext,
    separator: resolvedConfig.separator,
    screens: resolvedConfig.theme?.screens ? Object.keys(resolvedConfig.theme.screens) : [],
    variants: jitContext.getVariants(),
    editor: {
      userLanguages: {},
      capabilities: {
        configuration: true,
        diagnosticRelatedInformation: true,
        itemDefaults: [],
      },
      // oxlint-disable-next-line require-await
      async getConfiguration() {
        return {
          editor: { tabSize: 2 },
          // Default values are based on
          // https://github.com/tailwindlabs/tailwindcss-intellisense/blob/v0.9.1/packages/tailwindcss-language-server/src/server.ts#L259-L287
          tailwindCSS: {
            emmetCompletions: false,
            classAttributes: ["class", "className", "ngClass"],
            codeActions: true,
            hovers: true,
            suggestions: true,
            validate: true,
            colorDecorators: true,
            rootFontSize: 16,
            lint: {
              cssConflict: "warning",
              invalidApply: "error",
              invalidScreen: "error",
              invalidVariant: "error",
              invalidConfigPath: "error",
              invalidTailwindDirective: "error",
              recommendedVariantOrder: "warning",
            },
            showPixelEquivalents: true,
            includeLanguages: {},
            files: {
              // Upstream defines these values, but we don’t need them.
              exclude: [],
            },
            experimental: {
              classRegex: [],
              // Upstream types are wrong
              configFile: {},
            },
          },
        };
      },
      // This option takes some properties that we don’t have nor need.
    },
  };

  state.classList = jitContext
    .getClassList()
    // .filter((className) => className !== '*')
    .map((className) => [className, { color: getColor(state, className) }]);

  return state;
}

export function addPixelEquivalentsToValue(value: string, rootFontSize: number) {
  if (!value?.includes("rem")) {
    return value;
  }

  const commentPool: { content: string; sourceEndIndex: number }[] = [];

  parseValue(value).walk((node) => {
    if (node.type !== "word") {
      return true;
    }

    const unit = parseValue.unit(node.value);
    if (!unit || (unit.unit !== "rem" && unit.unit !== "rem;")) {
      return false;
    }

    const commentStr = ` /* ${parseFloat(unit.number) * rootFontSize}px */`;

    commentPool.push({
      content: commentStr,
      sourceEndIndex: node.sourceEndIndex,
    });

    return false;
  });

  let offset = 0;
  commentPool.forEach((comment) => {
    value =
      value.slice(0, comment.sourceEndIndex + offset) +
      comment.content +
      value.slice(comment.sourceEndIndex + offset);
    offset += comment.content.length;
  });

  return value;
}
