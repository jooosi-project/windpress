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
  const { fetch: originalFetch } = window;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    if (new URL(args[0]).searchParams.get("_breakdance_doing_ajax") === "yes") {
      const payload = Object.fromEntries(args[1].body.entries());
      if (response.ok && response.status === 200 && payload.action === "breakdance_save") {
        channel.postMessage({
          task: "generate-cache",
          source: "windpress/integration",
          target: "windpress/compiler",
          data: {
            kind: "incremental",
            incremental: {
              providers: ["breakdance"],
            },
          } as BuildCacheOptions,
        });
      }
    }

    return response;
  };
})();

logger("Module loaded!", { module: "generate-cache" });
