<script setup lang="ts">
import { onBeforeRouteLeave } from "vue-router";
import { inject, onBeforeMount, watch, type Ref } from "vue";
import { type WizardTheme } from "@/dashboard/composables/useWizard";
import { useWizardTree } from "@/dashboard/composables/useWizardTree";
import { useWizardDragDrop } from "@/dashboard/composables/useWizardDragDrop";
import WizardTreeItem from "@/dashboard/components/Wizard/WizardTreeItem.vue";

const theme = inject("theme") as Ref<WizardTheme>;

const treeLogic = useWizardTree("breakpoint", theme);
const {
  expandedTree,
  items,
  updateThemeFromItems,
  findItemByUid,
  addChild,
  addNext,
  deleteItem,
  initializeItems,
} = treeLogic;

const dragDropLogic = useWizardDragDrop(items, updateThemeFromItems, findItemByUid);
const { shouldBeDimmed, wasRecentlyMoved, isDescendantOf } = dragDropLogic;

watch(
  () => theme.value.namespaces.breakpoint,
  () => {
    initializeItems();
  },
  { deep: true },
);

function addBreakpointChild(uid: string) {
  addChild(uid);
}

function addBreakpointNext(uid: string) {
  addNext(uid);
}

function deleteBreakpoint(uid: string) {
  deleteItem(uid);
}

onBeforeMount(() => {
  initializeItems();
});

onBeforeRouteLeave((_, __, next) => {
  updateThemeFromItems();
  next();
});
</script>

<template>
  <UDashboardPanel
    id="wizard-screens"
    class="min-h-[calc(100svh-var(--wp-admin--admin-bar--height))]"
  >
    <UDashboardNavbar
      :title="i18n.__('Screens', 'wizard')"
      :toggle="false"
      :ui="{ title: 'text-sm' }"
    >
      <template #title>
        <UIcon name="lucide:monitor-smartphone" class="size-5" />
        {{ i18n.__("Screens", "wizard") }}
        <UBadge variant="soft" color="neutral">--breakpoint-*</UBadge>
        <UTooltip :text="i18n.__('Responsive breakpoint variants like sm:*', 'windpress')">
          <span class="text-xs opacity-60 font-normal">
            {{ i18n.__("Responsive breakpoint variants like sm:*", "windpress") }}
          </span>
        </UTooltip>
      </template>

      <template #right>
        <UTooltip :delay-duration="0" :text="i18n.__('Add new item', 'windpress')">
          <UButton color="neutral" variant="subtle" icon="i-lucide-plus" @click="addNext()" />
        </UTooltip>
        <UTooltip :text="i18n.__('Help', 'windpress')">
          <UButton
            icon="i-lucide-circle-help"
            color="neutral"
            variant="soft"
            to="https://tailwindcss.com/docs/responsive-design#customizing-your-theme"
            target="_blank"
          />
        </UTooltip>
      </template>
    </UDashboardNavbar>

    <div class="flex-1 overflow-y-auto p-4">
      <!-- Onboard / Empty state when no breakpoints are defined -->
      <div
        v-if="items.length === 0"
        class="flex flex-col items-center justify-center h-full text-center"
      >
        <UIcon name="lucide:monitor-smartphone" class="size-12 text-primary/50 mb-4" />
        <h3 class="text-lg font-semibold text-highlighted mb-2">
          {{ i18n.__("No breakpoints defined", "windpress") }}
        </h3>
        <p class="text-dimmed mb-6 max-w-sm">
          {{
            i18n.__(
              "Start building your responsive design system by adding custom breakpoints for different screen sizes.",
              "windpress",
            )
          }}
        </p>
        <div class="flex gap-2">
          <UButton
            :label="i18n.__('Add Breakpoint', 'windpress')"
            icon="lucide:plus"
            color="primary"
            variant="subtle"
            @click="addNext()"
          />
        </div>
      </div>

      <!-- Breakpoint tree when breakpoints exist -->
      <UTree
        v-else
        :items
        :get-key="(item) => String(item.value)"
        :ui="{ link: 'p-0' }"
        :expanded="expandedTree"
      >
        <template #item="{ item, level }">
          <WizardTreeItem
            :item="item"
            :level="level || 0"
            :should-be-dimmed="shouldBeDimmed"
            :was-recently-moved="wasRecentlyMoved"
            :is-descendant-of="isDescendantOf"
            :on-add-next="addBreakpointNext"
            :on-add-child="addBreakpointChild"
            :on-delete="deleteBreakpoint"
          />
        </template>
      </UTree>
    </div>
  </UDashboardPanel>
</template>
