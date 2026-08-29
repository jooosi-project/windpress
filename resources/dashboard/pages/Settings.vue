<script setup lang="ts">
import { computed } from "vue";
import { useSettingsStore } from "@/dashboard/stores/settings";
import { useRouter } from "vue-router";
import { useBusyStore } from "@/dashboard/stores/busy";
import { __ } from "@wordpress/i18n";

const router = useRouter();
const toast = useToast();

const settingsStore = useSettingsStore();
const busyStore = useBusyStore();

async function saveSetting() {
  const toastData: Omit<Partial<Toast>, "id"> = {
    title: __("Saving...", "windpress"),
    description: __("Please wait while we save your changes.", "windpress"),
    duration: 0,
    icon: "lucide:loader-circle",
    close: false,
    color: "neutral",
    ui: {
      icon: "animate-spin",
    },
  };

  if (toast.toasts.value.find((t) => t.id === "settings.doSave")) {
    toast.update("settings.doSave", {
      ...toastData,
    });
  } else {
    toast.add({
      id: "settings.doSave",
      ...toastData,
    });
  }

  return settingsStore
    .doPush()
    .then(() => {
      toast.update("settings.doSave", {
        title: __("Saved", "windpress"),
        description: __("Your changes have been saved.", "windpress"),
        icon: "i-lucide-save",
        color: "success",
        duration: undefined,
        close: true,
        ui: {
          icon: undefined,
        },
      });
    })
    .catch((err) => {
      toast.update("settings.doSave", {
        title: __("Error", "windpress"),
        description: __("An error occurred while saving your changes.", "windpress"),
        icon: "i-lucide-save",
        color: "error",
        duration: undefined,
        close: true,
        ui: {
          icon: undefined,
        },
      });

      // TODO: log error
    })
    .finally(() => {
      // TODO: broadcast event with channel
    });
}

const links = computed(() => [
  [
    {
      label: __("General", "windpress"),
      to: router.resolve({ name: "settings.general" }),
      icon: "lucide:settings",
      exact: true,
    },
    {
      label: __("Performance", "windpress"),
      to: router.resolve({ name: "settings.performance" }),
      icon: "lucide:rocket",
      exact: true,
    },
    {
      label: __("Integrations", "windpress"),
      to: router.resolve({ name: "settings.integrations" }),
      icon: "lucide:package",
    },
  ],
  [
    // {
    //     label: 'Documentation',
    //     icon: 'i-lucide-book-open',
    //     to: `https://windpress.jooo.si/docs?utm_source=wordpress-plugins&utm_medium=plugin-menu&utm_campaign=windpress&utm_id=all-edition&windpress_version=${window.windpress._version}`,
    //     target: '_blank'
    // },
    // {
    //     label: 'Support',
    //     icon: 'lucide:headset',
    //     to: `https://jooo.si/support-portal?utm_source=wordpress-plugins&utm_medium=plugin-menu&utm_campaign=windpress&utm_id=all-edition&windpress_version=${windpress._version}`,
    //     target: '_blank'
    // },
    {
      label: __("Save", "windpress"),
      icon: "lucide:save",
      color: "primary",
      onSelect: saveSetting,
      disabled: busyStore.isBusy,
      badge: settingsStore.hasChanged ? { color: "warning", variant: "solid" } : undefined,
    },
  ],
]);
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar :title="i18n.__('Settings', 'windpress')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
        <RouterView />

        <div class="flex justify-end">
          <UTooltip :text="i18n.__('Save', 'windpress')">
            <UChip v-if="settingsStore.hasChanged" color="warning" size="md">
              <UButton
                icon="i-lucide-save"
                color="primary"
                :label="i18n.__('Save', 'windpress')"
                @click="saveSetting"
                :disabled="busyStore.isBusy"
              />
            </UChip>
            <UButton
              v-else
              icon="i-lucide-save"
              color="primary"
              :label="i18n.__('Save', 'windpress')"
              @click="saveSetting"
              :disabled="busyStore.isBusy"
            />
          </UTooltip>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
