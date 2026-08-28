import { ComponentCustomProperties } from "vue";

declare module "vue" {
  interface ComponentCustomProperties {
    i18n: typeof import("@wordpress/i18n");
  }
}
