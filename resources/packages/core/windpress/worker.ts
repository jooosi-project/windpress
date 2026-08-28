import { buildCache, type BuildCacheOptions } from "./compiler";

function cacheWorker() {
  const channel = new BroadcastChannel("windpress");
  let buildQueue: Promise<void> = Promise.resolve();

  channel.addEventListener("message", async (e) => {
    const data = e.data;
    const source = ["windpress/dashboard", "windpress/integration"];
    const target = "windpress/compiler";

    if (source.includes(data.source) && data.target === target && data.task === "generate-cache") {
      buildQueue = buildQueue
        .then(async () => {
          await buildCache(data.data as BuildCacheOptions)
            .then(() => {
              channel.postMessage({
                source: "windpress/compiler",
                target: "windpress/dashboard",
                task: "generate-cache.response",
                data: {
                  status: "success",
                },
              });
            })
            .catch((e) => {
              channel.postMessage({
                source: "windpress/compiler",
                target: "windpress/dashboard",
                task: "generate-cache.response",
                data: {
                  status: "error",
                },
              });

              console.error(e);
            });
        })
        .catch((e) => {
          console.error(e);
        });
    }
  });
}

export async function setupWorker() {
  if ("locks" in navigator) {
    navigator.locks
      .request("task_lock", { mode: "exclusive" }, (lock) => {
        console.log("Lock acquired. Starting worker.");

        // Start the cache worker
        cacheWorker();

        // Keep the lock until the tab is closed
        return new Promise(() => {});
      })
      .catch(() => {
        console.log("Failed to acquire lock. Worker already running in another tab.");
      });
  } else {
    console.log("Locks API not supported in this browser. Starting worker without lock.");
    cacheWorker();
  }
}
