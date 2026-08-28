import i18n from "@wordpress/i18n";

export default {
  install: (app: any, options?: any) => {
    app.config.globalProperties.i18n = i18n;
  },
};
