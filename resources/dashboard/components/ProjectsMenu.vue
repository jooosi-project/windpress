<script setup lang="ts">
import { ref, computed } from "vue";
import { useSettingsStore } from "@/dashboard/stores/settings";
import Logo from "@/dashboard/assets/icon/windpress.svg";
import { version as tw4_version } from "tailwindcss/package.json";
import { version as tw3_version } from "tailwindcss3/package.json";

defineProps<{
  collapsed?: boolean;
}>();

const settingsStore = useSettingsStore();

const projects = ref([
  {
    label: "WindPress",
    avatar: {
      src: Logo, // https://github.com/jooosi-project/windpress/raw/refs/heads/main/public/favicon.svg
      alt: "WindPress",
    },
  },
]);

const selectedProject = ref(projects.value[0]);

const items = computed(() => {
  return [
    [
      {
        label: `v${window.windpress._wp_version}`,
        icon: "fa6-brands:wordpress",
      },
      {
        label:
          Number(settingsStore.virtualOptions("general.tailwindcss.version", 4).value) === 4
            ? `v${tw4_version}`
            : `v${tw3_version}`,
        icon: "devicon:tailwindcss",
      },
      {
        label: `v${window.windpress._version}`,
        avatar: {
          src: Logo,
          alt: "WindPress",
        },
      },
    ],
  ];
});
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedProject,
        label: collapsed ? undefined : selectedProject?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-(--ui-bg-elevated)"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-(--ui-text-dimmed)',
      }"
    />
  </UDropdownMenu>
</template>
