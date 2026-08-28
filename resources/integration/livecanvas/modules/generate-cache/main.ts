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
      if (method === "POST" && url.includes("admin-ajax.php")) {
        const onreadystatechange = xhr.onreadystatechange;

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status === 200) {
            if (xhr.responseText === "Save") {
              channel.postMessage({
                task: "generate-cache",
                source: "windpress/integration",
                target: "windpress/compiler",
                data: {
                  kind: "incremental",
                  incremental: {
                    providers: ["livecanvas"],
                  },
                } as BuildCacheOptions,
              });
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
