import twResolveConfig from "tailwindcss3/src/public/resolve-config.js";
import { importLocalModule } from "@/packages/core/tailwindcss/module";
import { Volume } from "memfs";
import twPreflight from "tailwindcss3/src/css/preflight.css?raw";

export async function resolveConfig(volume = {}, entrypoint = "/tailwind.config.js") {
  const importedConfig = await importLocalModule(entrypoint, undefined, "config", volume);

  // workaround to ensure that the preflight.css is available in the browser environment, because tailwindcss3/src/corePlugins.js is trying to read it from the filesystem
  if (window.windpress && !window.windpress.__MEMFS_VOLUME__) {
    window.windpress.__MEMFS_VOLUME__ = new Volume();
    window.windpress.__MEMFS_VOLUME__.mkdirSync("/css", { recursive: true });
    window.windpress.__MEMFS_VOLUME__.writeFileSync("/css/preflight.css", twPreflight, "utf8");
  }

  return twResolveConfig(importedConfig.module);
}
