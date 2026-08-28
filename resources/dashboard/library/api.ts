import axios from "redaxios";

let apiInstance: ReturnType<typeof axios.create>;

/**
 * Returns an Axios (redaxios) instance for making API requests. The instance is created only once.
 */
export function useApi(config = {}): ReturnType<typeof axios.create> {
  if (!apiInstance) {
    apiInstance = axios.create(
      Object.assign(
        {
          baseURL: window.windpress.rest_api.url || "",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            "X-WP-Nonce": window.windpress.rest_api.nonce || "",
          },
        },
        config,
      ),
    );
  }
  return apiInstance;
}
