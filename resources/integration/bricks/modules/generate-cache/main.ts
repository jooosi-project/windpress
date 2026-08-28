/**
 * @module generate-cache
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Generate cache when post saved
 */

import { logger } from "@/integration/common/logger";
import { settingsState } from "@/integration/bricks/constant";
import type { BuildCacheOptions } from "@/packages/core/windpress/compiler";

const channel = new BroadcastChannel("windpress");

(function () {
  const __xhr = window.XMLHttpRequest;
  function XMLHttpRequest() {
    const xhr = new __xhr();

    if (!settingsState("module.generate-cache.on-save", true).value) {
      return xhr;
    }

    const open = xhr.open;

    xhr.open = function (method, url) {
      if (method === "POST" && url.includes("admin-ajax.php")) {
        const onreadystatechange = xhr.onreadystatechange;

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.data && response.data.action) {
              if (response.data.action === "bricks_save_post") {
                channel.postMessage({
                  task: "generate-cache",
                  source: "windpress/integration",
                  target: "windpress/compiler",
                  data: {
                    kind: "incremental",
                    incremental: {
                      providers: ["bricks"],
                    },
                  } as BuildCacheOptions,
                });
              }
            }
          }

          if (onreadystatechange) {
            onreadystatechange.apply(this, arguments);
          }
        };
      }

      open.apply(this, arguments);
    };

    return xhr;
  }

  window.XMLHttpRequest = XMLHttpRequest;
})();

logger("Module loaded!", { module: "generate-cache" });
