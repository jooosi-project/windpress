import { defineStore } from "pinia";
import { nanoid } from "nanoid";
import { useStorage } from "@vueuse/core";

export type Log = {
  /** The message to log. */
  message: string;

  /** The type of the log entry. */
  type: "success" | "info" | "warning" | "error" | "debug";

  /** The namespace or group name of the log. */
  group?: string;

  /** The unique identifier of the log (if available). */
  id?: string;

  /** The timestamp of the log (Unix time in milliseconds). */
  timestamp?: number;

  /** Additional options related to the log entry. */
  options?: object;
};

export function createLogComposable() {
  const welcomeLog: Log = {
    id: "JqhEkI6VK0",
    timestamp: 1742407548572,
    type: "debug",
    message:
      'Thank you for using WindPress! Join us on the Facebook Group: <a href="https://windpress.jooo.si/go/facebook" target="_blank" class="underline">https://windpress.jooo.si/go/facebook</a>',
    options: {
      raw: true,
    },
  };

  const logs = useStorage("windpress.dashboard.store.logs", [welcomeLog] as Log[]);

  // TODO: clear logs older than 30 days or over 150 entries

  function add(log: Log): string {
    const id: string = nanoid(10);
    logs.value.push({
      id,
      timestamp: Date.now(),
      ...log,
    });

    return id;
  }

  function update(id: string, log: Log) {
    const curr = logs.value.find((l) => l.id === id);

    if (curr) {
      Object.assign(curr, log);
    }
  }

  function remove(toSearch: string, by: "id" | "message" | "type" | "group" = "id"): void {
    switch (by) {
      case "message":
        logs.value = logs.value.filter((log) => !log.message.includes(toSearch));
        break;
      case "type":
        logs.value = logs.value.filter((log) => log.type !== toSearch);
        break;
      case "group":
        logs.value = logs.value.filter((log) => log.group !== toSearch);
        break;
      case "id":
      default:
        logs.value = logs.value.filter((log) => log.id !== toSearch);
        break;
    }
  }

  function clear() {
    logs.value = [];
    logs.value.push(welcomeLog);
  }

  return {
    logs,
    add,
    update,
    remove,
    clear,
  };
}

export const useLogStore = defineStore("log", () => {
  const composable = createLogComposable();

  return {
    ...composable,
  };
});
