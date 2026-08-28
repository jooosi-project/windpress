/**
 * @module generate-cache
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Generate cache when post saved
 */

import { logger } from "@/integration/common/logger";
import type { BuildCacheOptions } from "@/packages/core/windpress/compiler";

const channel = new BroadcastChannel("windpress");

(function () {
  const __xhr = window.XMLHttpRequest;
  function XMLHttpRequest() {
    const xhr = new __xhr();

    const open = xhr.open;

    xhr.open = function (method, url) {
      if (method === "POST" && url.includes("v2/builderius")) {
        const onreadystatechange = xhr.onreadystatechange;

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);

              if (
                response.commit_entity?.errors?.length === 0 ||
                response.commit_global?.errors?.length === 0
              ) {
                channel.postMessage({
                  task: "generate-cache",
                  source: "windpress/integration",
                  target: "windpress/compiler",
                  data: {
                    kind: "incremental",
                    incremental: {
                      providers: ["builderius"],
                    },
                  } as BuildCacheOptions,
                });
              }
            } catch (err) {
              logger("Failed to intercept the response.", err, { module: "generate-cache" });
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
