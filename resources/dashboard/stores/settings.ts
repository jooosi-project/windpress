import { defineStore } from "pinia";
import { useApi } from "../library/api.js";
import { useBusyStore } from "./busy.js";
import { cloneDeep, isEqual } from "lodash-es";
import { createVirtualRef } from "@/dashboard/composables/virtualRef";
import { computed, ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  const busyStore = useBusyStore();
  const api = useApi();

  const { state: options, getVirtualRef: virtualOptions } = createVirtualRef({});

  /**
   * The initial options data which will be used to check if the data has changed.
   */
  const initOptions = ref({});

  /**
   * Pull the data from the server.
   *
   * @returns {Promise} A promise.
   */
  async function doPull() {
    busyStore.add("settings.doPull");

    return await api
      .request("/admin/settings/options/index", { method: "GET" })
      .then((response) => {
        options.value = cloneDeep(response.data.options);
        initOptions.value = cloneDeep(response.data.options);
        return {
          message: response.data.message,
          success: true,
        };
      })
      .catch((error) => {
        // notifier.alert(error.message);
      })
      .finally(() => {
        busyStore.remove("settings.doPull");
      });
  }

  /**
   * Push the data to the server.
   *
   * @returns {Promise} A promise
   */
  async function doPush() {
    busyStore.add("settings.doPush");

    return api
      .request("/admin/settings/options/store", {
        method: "POST",
        data: {
          options: options.value,
        },
      })
      .then((response) => {
        initOptions.value = cloneDeep(options.value);
        return {
          message: response.data.message,
          success: true,
        };
      })
      .catch((error) => {
        throw new Error(error.response ? error.response.data.message : error.message);
      })
      .finally(() => {
        busyStore.remove("settings.doPush");
      });
  }

  /**
   * Pull the data from the server when the store is initialized.
   */
  function initPull() {
    if (Object.keys(options.value as object).length === 0) {
      doPull();
    }
  }

  /**
   * Check if the data has changed.
   */
  const hasChanged = computed(() => !isEqual(options.value, initOptions.value));

  return {
    options,
    virtualOptions,
    doPull,
    doPush,
    initPull,
    hasChanged,
  };
});
