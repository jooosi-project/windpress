import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useApi } from "@/dashboard/library/api.js";
import { useBusyStore } from "./busy.js";
import { cloneDeep, get } from "lodash-es";

export const useLicenseStore = defineStore("license", () => {
  const busyStore = useBusyStore();
  const api = useApi();

  const license = ref({
    key: "",
  });

  const isActivated = computed(() => {
    return get(license.value, "is_activated", false);
  });

  /**
   * Pull the data from the server.
   *
   * @returns {Promise} A promise.
   */
  async function doPull() {
    busyStore.add("settings.license.doPull");

    return await api
      .request("/admin/settings/license/index", {
        method: "GET",
      })
      .then((response) => {
        license.value = cloneDeep(response.data.license);
      })
      .catch((error) => {
        // notifier.alert(error.message);
      })
      .finally(() => {
        busyStore.remove("settings.license.doPull");
      });
  }

  async function doActivate(licenseKey: string) {
    busyStore.add("settings.license.activate");

    return api
      .request("/admin/settings/license/activate", {
        method: "POST",
        data: {
          license: licenseKey,
        },
      })
      .then((response) => {
        license.value = cloneDeep(response.data.license);
        return {
          message: response.data.message,
          success: true,
        };
      })
      .catch((error) => {
        throw new Error(error.data ? error.data.message : error.message);
      })
      .finally(() => {
        busyStore.remove("settings.license.activate");
      });
  }

  async function doDeactivate() {
    busyStore.add("settings.license.deactivate");

    return api
      .request("/admin/settings/license/deactivate", {
        method: "POST",
        data: {
          license: license.value,
        },
      })
      .then((response) => {
        license.value = cloneDeep(response.data.license);
        return {
          message: response.data.message,
          success: true,
        };
      })
      .catch((error) => {
        throw new Error(error.response ? error.response.data.message : error.message);
      })
      .finally(() => {
        busyStore.remove("settings.license.deactivate");
      });
  }

  return {
    license,
    isActivated,
    doPull,
    doActivate,
    doDeactivate,
  };
});
