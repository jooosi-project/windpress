import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useLogStore } from "./log";

export type Task = {
  // The timestamp of the task (Unix time in milliseconds).
  timestamp: number;

  // The name of the task.
  task?: string;
};

export type Message = {
  // The message to log.
  message: string;

  // The type of the log entry.
  type: "success" | "info" | "warning" | "error";

  // The namespace or group name of the message.
  group: string;
};

export const useBusyStore = defineStore("busy", () => {
  const log = useLogStore();

  const tasks = ref<Task[]>([]);

  const isBusy = computed(() => tasks.value.length > 0);

  const hasTask = computed(() => {
    return (task: string): boolean => tasks.value.some((t: Task) => t.task === task);
  });

  function add(task: string, message?: Message) {
    tasks.value.unshift({
      timestamp: Date.now(),
      task,
    });

    if (message !== undefined && message !== null) {
      if (typeof message === "string") {
        log.add({
          message,
          type: "info",
          group: "busy",
        });
      } else if (typeof message === "object") {
        log.add(
          Object.assign(
            {
              type: "info",
              group: "busy",
            },
            message,
          ),
        );
      }
    }
  }

  function remove(task: string) {
    let found = false;
    tasks.value = tasks.value.filter((t) => {
      if (found) {
        return true;
      }
      if (t.task === task) {
        found = true;
        return false;
      }
      return true;
    });
  }

  function reset() {
    tasks.value = [];
  }

  return {
    tasks,
    isBusy,
    hasTask,
    add,
    remove,
    reset,
  };
});
