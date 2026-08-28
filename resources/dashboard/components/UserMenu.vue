<script setup lang="ts">
import { __ } from "@wordpress/i18n";
import { ref, computed } from "vue";
import type { DropdownMenuItem } from "@nuxt/ui";
import { useColorMode } from "@vueuse/core";

defineProps<{
  collapsed?: boolean;
}>();

const colorMode = useColorMode();
const appConfig = useAppConfig();

const user = ref({
  name: windpress.current_user.name,
  avatar: {
    src: windpress.current_user.avatar,
    alt: windpress.current_user.name,
  },
});

const supportMenuItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = [
    {
      label: __("Rate us", "windpress"),
      icon: "lucide:star",
      to: "https://wordpress.org/support/plugin/windpress/reviews/?filter=5/#new-post",
      target: "_blank",
    },
    {
      label: __("Community", "windpress"),
      icon: "fa6-brands:facebook",
      to: "https://windpress.jooo.si/go/facebook",
      target: "_blank",
    },
    {
      label: __("Report an issue", "windpress"),
      icon: "lucide:bug",
      to: "https://github.com/jooosi-project/windpress/issues",
      target: "_blank",
    },
    {
      label: __("Support", "windpress"),
      icon: "lucide:headset",
      to: `https://rosua.org/support-portal?utm_source=wordpress-plugins&utm_medium=plugin-menu&utm_campaign=windpress&utm_id=all-edition&windpress_version=${window.windpress._version}`,
      target: "_blank",
    },
  ];

  if (window.windpress._via_wp_org) {
    items.push({
      label: __("Upgrade to Pro", "windpress"),
      icon: "lucide:sparkles",
      to: `https://windpress.jooo.si/?utm_source=wordpress-plugins&utm_medium=plugin-menu&utm_campaign=windpress&utm_id=all-edition&windpress_version=${window.windpress._version}#pricing`,
      target: "_blank",
    });
  }

  return items;
});

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: "label",
      label: user.value.name,
      avatar: user.value.avatar,
    },
  ],
  [
    {
      label: __("Appearance", "windpress"),
      icon: "i-lucide-sun-moon",
      children: [
        {
          label: __("Light", "windpress"),
          icon: appConfig.ui.icons.light,
          type: "checkbox",
          checked: colorMode.value === "light",
          onSelect(e: Event) {
            e.preventDefault();

            colorMode.value = "light";
          },
        },
        {
          label: __("Dark", "windpress"),
          icon: appConfig.ui.icons.dark,
          type: "checkbox",
          checked: colorMode.value === "dark",
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.value = "dark";
            }
          },
          onSelect(e: Event) {
            e.preventDefault();
          },
        },
        {
          label: __("System", "windpress"),
          icon: appConfig.ui.icons.system,
          type: "checkbox",
          checked: colorMode.value === "system",
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.value = "system";
            }
          },
          onSelect(e: Event) {
            e.preventDefault();
          },
        },
      ],
    },
  ],
  [...supportMenuItems.value],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-(--ui-bg-elevated)"
      :ui="{
        trailingIcon: 'text-(--ui-text-dimmed)',
      }"
    />

    <template #chip-leading="{ item }">
      <span
        :style="{ '--chip': `var(--color-${(item as any).chip}-400)` }"
        class="ms-0.5 size-2 rounded-full bg-(--chip)"
      />
    </template>
  </UDropdownMenu>
</template>
