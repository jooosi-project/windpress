import { createWebHistory, createRouter } from "vue-router";

const router = createRouter({
  history: createWebHistory(`${window.windpress.site_meta.web_history}#/`),
  scrollBehavior(_, _2, savedPosition) {
    return savedPosition || { left: 0, top: 0 };
  },
  routes: [
    { path: "/", name: "home", redirect: { name: "files" } },
    {
      path: "/files",
      name: "files",
      component: () => import("./pages/File.vue"),
    },
    {
      path: "/logs",
      name: "logs",
      component: () => import("./pages/Log.vue"),
    },
    {
      path: "/wizard",
      name: "wizard",
      redirect: { name: "wizard.theme" },
      component: () => import("./pages/Wizard.vue"),
      children: [
        {
          path: "screens",
          name: "wizard.screens",
          component: () => import("./pages/Wizard/Screens.vue"),
        },
        {
          path: "colors",
          name: "wizard.colors",
          component: () => import("./pages/Wizard/Colors.vue"),
        },
        {
          path: "typography",
          name: "wizard.typography",
          component: () => import("./pages/Wizard/Typography.vue"),
        },
        {
          path: "spacing",
          name: "wizard.spacing",
          component: () => import("./pages/Wizard/Spacing.vue"),
        },
        {
          path: "theme",
          name: "wizard.theme",
          component: () => import("./pages/Wizard/Theme.vue"),
        },
      ],
    },
    {
      path: "/settings",
      name: "settings",
      redirect: { name: "settings.general" },
      component: () => import("./pages/Settings.vue"),
      children: [
        {
          path: "general",
          name: "settings.general",
          component: () => import("./pages/Settings/General.vue"),
        },
        {
          path: "performance",
          name: "settings.performance",
          component: () => import("./pages/Settings/Performance.vue"),
        },
        {
          path: "integrations",
          component: () => import("./pages/Settings/Integrations.vue"),
          children: [
            {
              path: "",
              name: "settings.integrations",
              component: { template: "<div />" }, // Empty component for the index route
            },
            {
              path: ":integration",
              name: "settings.integrations.detail",
              component: () => import("./pages/Settings/Integrations/[integration].vue"),
            },
          ],
        },
      ],
    },
    {
      path: "/about",
      name: "about",
      component: () => import("./pages/About.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      name: "NotFound",
      component: () => import("./pages/NotFound.vue"),
    },
  ],
});

export default router;
