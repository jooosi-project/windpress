/**
 * @module autocomplete
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Provide autocomplete suggestions hooks for class names.
 */

import { logger } from "@/integration/common/logger";
import { previewIframe } from "@/integration/livecanvas/constant.js";

wp.hooks.addFilter(
  "windpresslivecanvas-autocomplete-items-query",
  "windpresslivecanvas",
  async (text, autocompleteItems) => {
    const windpress_suggestions =
      await previewIframe.contentWindow.windpress.module.autocomplete.query(text);

    return autocompleteItems !== undefined
      ? [...windpress_suggestions, ...autocompleteItems]
      : windpress_suggestions;
  },
);

logger("Module loaded!", { module: "autocomplete" });
