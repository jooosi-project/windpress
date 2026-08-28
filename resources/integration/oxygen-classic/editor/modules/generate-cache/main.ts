/**
 * @module generate-cache
 * @package WindPress
 * @since 3.0.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * Generate cache when post saved
 */

import { logger } from "@/integration/common/logger";
import { iframeScope } from "@/integration/oxygen-classic/editor/constant";
import type { BuildCacheOptions } from "@/packages/core/windpress/compiler";

const channel = new BroadcastChannel("windpress");

const originalAllSaved = iframeScope.allSaved;

iframeScope.allSaved = function () {
  originalAllSaved.apply(this, arguments);

  channel.postMessage({
    task: "generate-cache",
    source: "windpress/integration",
    target: "windpress/compiler",
    data: {
      kind: "incremental",
      incremental: {
        providers: ["oxygen-classic"],
      },
    } as BuildCacheOptions,
  });
};

logger("Module loaded!", { module: "generate-cache" });
