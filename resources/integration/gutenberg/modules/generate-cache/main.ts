/**
 * @module generate-cache
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Generate cache when post saved
 */

import { logger } from "@/integration/common/logger";
import { isGenerateCacheOnSaveEnabled, initializePreferences } from "./preferences-panel.jsx";
import type { BuildCacheOptions } from "@/packages/core/windpress/compiler";

// Initialize preferences
initializePreferences();

const channel = new BroadcastChannel("windpress");

(function () {
  const __fetch = window.fetch;

  window.fetch = function (input, init) {
    const url = input instanceof Request ? input.url : String(input ?? "");

    // Check if preferences are enabled
    if (!isGenerateCacheOnSaveEnabled()) {
      return __fetch.apply(this, arguments);
    }

    // Intercept WordPress REST API post save requests
    if (init?.method === "POST" || init?.method === "PUT") {
      // Match both post editor and site editor save endpoints
      const isPostSave =
        url.includes("/wp/v2/posts/") ||
        url.includes("/wp/v2/pages/") ||
        url.includes("/wp/v2/wp_template/") ||
        url.includes("/wp/v2/wp_template_part/");

      if (isPostSave) {
        const originalFetch = __fetch.apply(this, arguments);

        originalFetch
          .then((response) => {
            if (response.ok) {
              logger("Post saved, generating cache...", { module: "generate-cache" });

              channel.postMessage({
                task: "generate-cache",
                source: "windpress/integration",
                target: "windpress/compiler",
                data: {
                  kind: "incremental",
                  incremental: {
                    providers: ["gutenberg"],
                  },
                } as BuildCacheOptions,
              });
            }
          })
          .catch((error) => {
            logger("Error saving post", { module: "generate-cache", error });
          });

        return originalFetch;
      }
    }

    return __fetch.apply(this, arguments);
  };
})();

logger("Module loaded!", { module: "generate-cache" });
