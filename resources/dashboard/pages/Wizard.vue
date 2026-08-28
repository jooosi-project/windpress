<script setup lang="ts">
import { onBeforeRouteLeave } from "vue-router";
import { ref, onBeforeMount, provide, computed } from "vue";
import type { NavigationMenuItem } from "@nuxt/ui";
import { type Entry, useVolumeStore } from "@/dashboard/stores/volume";
import { useWizard } from "@/dashboard/composables/useWizard";
import { __ } from "@wordpress/i18n";
import { useRouter } from "vue-router";
import { useSettingsStore } from "@/dashboard/stores/settings";
import { useFileAction } from "@/dashboard/composables/useFileAction";
import VersionRequirement from "@/dashboard/components/Wizard/VersionRequirement.vue";

const volumeStore = useVolumeStore();
const fileAction = useFileAction();
const wizard = useWizard();
const router = useRouter();
const settingsStore = useSettingsStore();

const theme = ref(wizard.getDefaultTheme());
provide("theme", theme);

// Check if Tailwind CSS v4 is active
const isTailwindV4 = computed(() => {
  return settingsStore.virtualOptions("general.tailwindcss.version", 4).value === 4;
});

onBeforeMount(async () => {
  await Promise.all([volumeStore.initPull(), settingsStore.initPull()]);

  // Only parse wizard.css when Tailwind CSS v4 is active
  if (isTailwindV4.value) {
    let wizardContent =
      volumeStore.data.entries.find((entry: Entry) => entry.relative_path === "wizard.css")
        ?.content || "";

    if (!wizardContent.includes("@theme")) {
      wizardContent += "\n@theme {\n\n}";
    }

    theme.value = wizard.parseWizardFile(wizardContent);
  }
});

function saveWizard() {
  const wizardFileContent = wizard.stringifyTheme(theme.value);

  // update or create the wizard.css entry in the volume store
  const existingEntry = volumeStore.data.entries.find(
    (entry: Entry) => entry.relative_path === "wizard.css",
  );
  if (existingEntry) {
    existingEntry.content = wizardFileContent;
  } else {
    volumeStore.data.entries.push({
      name: "wizard.css",
      relative_path: "wizard.css",
      content: wizardFileContent,
      handler: "internal",
    });
  }
  fileAction.save();
}

const links = ref<NavigationMenuItem[][]>([
  [
    {
      label: __("Namespaces", "windpress"),
      type: "label",
    },
    {
      label: __("Screens", "windpress"),
      icon: "lucide:monitor-smartphone",
      to: router.resolve({ name: "wizard.screens" }),
    },
    {
      label: __("Spacing", "windpress"),
      icon: "lucide:align-horizontal-space-around",
      to: router.resolve({ name: "wizard.spacing" }),
    },
    {
      label: __("Typography", "windpress"),
      icon: "lucide:a-large-small",
      to: router.resolve({ name: "wizard.typography" }),
    },
    {
      label: __("Colors", "windpress"),
      icon: "lucide:swatch-book",
      to: router.resolve({ name: "wizard.colors" }),
    },
  ],
  [
    {
      label: __("Theme Configuration", "windpress"),
      type: "label",
    },
    {
      label: __("Theme Settings", "windpress"),
      icon: "lucide:settings",
      to: router.resolve({ name: "wizard.theme" }),
    },
  ],
]);

onBeforeRouteLeave((_1, _2, next) => {
  // Save the theme when leaving the route if Tailwind v4 is active
  if (isTailwindV4.value) {
    saveWizard();
  }
  next();
});
</script>

<template>
  <!-- Show version requirement when Tailwind v3 is active -->
  <VersionRequirement v-if="!isTailwindV4" />

  <!-- Show normal wizard interface when Tailwind v4 is active -->
  <template v-else>
    <UDashboardPanel
      id="wizard-1"
      :default-size="20"
      :min-size="15"
      :max-size="30"
      resizable
      class="min-h-[calc(100svh-var(--wp-admin--admin-bar--height))]"
    >
      <UDashboardNavbar :title="i18n.__('Wizard', 'windpress')" class="text-sm">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UTooltip :text="i18n.__('Save the changes to wizard.css file', 'windpress')">
            <UButton icon="i-lucide-save" color="primary" variant="subtle" @click="saveWizard" />
          </UTooltip>
        </template>
      </UDashboardNavbar>

      <UNavigationMenu :items="links[1]" orientation="vertical" class="my-2" />
      <UNavigationMenu :items="links[0]" orientation="vertical" />
      <!-- <UNavigationMenu :items="links[1]" orientation="vertical" class="mt-auto" /> -->
    </UDashboardPanel>

    <RouterView />
  </template>
</template>
