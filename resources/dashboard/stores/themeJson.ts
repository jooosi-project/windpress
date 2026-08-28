import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "@/dashboard/library/api";
import { __ } from "@wordpress/i18n";
import { useBusyStore } from "./busy";

export const useThemeJsonStore = defineStore("themeJson", () => {
  const api = useApi();
  const busyStore = useBusyStore();

  /**
   * WordPress theme.json data/object that will be used on the Gutenberg editor.
   *
   * $schema: https://schemas.wp.org/trunk/theme.json
   */
  const themeJson = ref<object>({});

  /**
   * Push the data to the server.
   *
   * @returns {Promise} A promise
   */
  async function doPush() {
    busyStore.add("themeJson.doPush");

    return api
      .request("/admin/theme-json/store", {
        method: "POST",
        data: {
          data: btoa(
            JSON.stringify(themeJson.value, null, window.windpress.is_debug ? 2 : undefined),
          ),
        },
      })
      .then((response) => {
        return { message: response.data.message, success: true };
      })
      .catch((error) => {
        throw new Error(error.response ? error.response.data.message : error.message);
      })
      .finally(() => {
        busyStore.remove("themeJson.doPush");
      });
  }

  return {
    themeJson,
    doPush,
  };
});
