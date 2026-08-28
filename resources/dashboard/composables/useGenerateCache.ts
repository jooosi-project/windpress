import { __, sprintf } from "@wordpress/i18n";
import { useBusyStore } from "@/dashboard/stores/busy";
import { useSettingsStore } from "@/dashboard/stores/settings";
import type { BuildCacheOptions } from "@/packages/core/windpress/compiler";
import prettyMilliseconds from "pretty-ms";

const channel = new BroadcastChannel("windpress");

export function useGenerateCache() {
  const settingsStore = useSettingsStore();
  const busyStore = useBusyStore();
  const toast = useToast();

  async function generateCache(cb?: (status: boolean) => void) {
    busyStore.add("settings.performance.cached_css.generate");

    const toastData: Omit<Partial<Toast>, "id"> = {
      title: __("Generating cache...", "windpress"),
      description: __("Please wait while we generate the CSS cache.", "windpress"),
      duration: 0,
      icon: "lucide:loader-circle",
      close: false,
      color: "neutral",
      ui: {
        icon: "animate-spin",
      },
    };

    if (toast.toasts.value.find((t) => t.id === "worker.doGenerateCache")) {
      toast.update("worker.doGenerateCache", {
        ...toastData,
      });
    } else {
      toast.add({
        id: "worker.doGenerateCache",
        ...toastData,
      });
    }

    const timeStart = performance.now();
    let timeEnd = timeStart;

    channel.postMessage({
      task: "generate-cache",
      source: "windpress/dashboard",
      target: "windpress/compiler",
      data: {
        tailwindcss_version: Number(
          settingsStore.virtualOptions("general.tailwindcss.version", 4).value,
        ),
        sourcemap: Boolean(
          settingsStore.virtualOptions("performance.cache.source_map", false).value,
        ),
      } as BuildCacheOptions,
    });

    channel.addEventListener("message", (event) => {
      const data = event.data;
      const source = "windpress/compiler";
      const target = "windpress/dashboard";
      if (
        data.source === source &&
        data.target === target &&
        data.task === "generate-cache.response"
      ) {
        busyStore.remove("settings.performance.cached_css.generate");

        timeEnd = performance.now();

        if (data.data.status === "success") {
          toast.update("worker.doGenerateCache", {
            title: __("Cache generated", "windpress"),
            description: sprintf(
              __("Cache generated in %s.", "windpress"),
              prettyMilliseconds(timeEnd - timeStart),
            ),
            icon: "lucide:codesandbox",
            color: "success",
            duration: undefined,
            close: true,
            ui: {
              icon: undefined,
            },
          });
          cb?.(true);
        } else if (data.data.status === "error") {
          toast.update("worker.doGenerateCache", {
            title: __("Generate Cache Error", "windpress"),
            description: __(
              "An error occurred while generating the CSS cache. Check the Browser's Console for more information",
              "windpress",
            ),
            icon: "lucide:codesandbox",
            color: "error",
            duration: undefined,
            close: true,
            ui: {
              icon: undefined,
            },
          });
          cb?.(false);
        }
      }
    });
  }

  return {
    generateCache,
  };
}
