<script setup lang="ts">
import { nanoid } from "nanoid";
import { __ } from "@wordpress/i18n";
import { onBeforeRouteLeave } from "vue-router";
import { inject, onBeforeMount, watch, type Ref } from "vue";
import { type WizardTheme } from "@/dashboard/composables/useWizard";
import { useWizardTree } from "@/dashboard/composables/useWizardTree";
import { useWizardDragDrop } from "@/dashboard/composables/useWizardDragDrop";
import WizardTreeItem from "@/dashboard/components/Wizard/WizardTreeItem.vue";
import {
  default as FluidCalculatorSlideover,
  calcFluid,
  type FluidCalculatorData,
} from "@/dashboard/components/Wizard/FluidCalculatorSlideover.vue";

const overlay = useOverlay();
const toast = useToast();

const theme = inject("theme") as Ref<WizardTheme>;

const treeLogic = useWizardTree("spacing", theme);
const {
  expandedTree,
  items,
  updateThemeFromItems,
  findItemByUid,
  addChild,
  addNext,
  deleteItem,
  initializeItems,
  findOrCreateItemByKey,
} = treeLogic;

const dragDropLogic = useWizardDragDrop(items, updateThemeFromItems, findItemByUid);
const { shouldBeDimmed, wasRecentlyMoved, isDescendantOf } = dragDropLogic;

watch(
  () => theme.value.namespaces.spacing,
  () => {
    initializeItems();
  },
  { deep: true },
);

function addSpacingChild(uid: string) {
  addChild(uid, "", `calc(var(--spacing) * VALUE_HERE)`);
}

function addSpacingNext(uid?: string) {
  addNext(uid, "", `calc(var(--spacing) * VALUE_HERE)`);
}

function deleteSpacing(uid: string) {
  deleteItem(uid);
}

function generateFluid(fluidConfig: FluidCalculatorData) {
  let parentItem = null;

  let newItemPool = [];

  const prefix = fluidConfig.miscPrefix
    .trim()
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .replace(/[^a-zA-Z0-9-]/g, "_");

  if (prefix) {
    parentItem = findOrCreateItemByKey(prefix);
  }

  for (let i = 1; i <= fluidConfig.stepsSmaller; i++) {
    let key = "";
    if (i === fluidConfig.stepsSmaller) {
      key += "sm";
    } else if (i === fluidConfig.stepsSmaller - 1) {
      key += "xs";
    } else {
      key += `${fluidConfig.stepsSmaller - i}xs`;
    }

    let currentMinSize = fluidConfig.minSize;
    let currentMaxSize = fluidConfig.maxSize;

    for (let j = 0; j < fluidConfig.stepsSmaller + 1 - i; j++) {
      currentMinSize /= fluidConfig.minScale;
      currentMaxSize /= fluidConfig.maxScale;
    }

    newItemPool.push({
      key: key,
      value: calcFluid(
        currentMinSize,
        currentMaxSize,
        fluidConfig.minViewport,
        fluidConfig.maxViewport,
      ),
    });
  }

  newItemPool.push({
    key: "base",
    value: calcFluid(
      fluidConfig.minSize,
      fluidConfig.maxSize,
      fluidConfig.minViewport,
      fluidConfig.maxViewport,
    ),
  });

  for (let i = 1; i <= fluidConfig.stepsLarger; i++) {
    let key = "";
    if (i === 1) {
      key += "lg";
    } else if (i === 2) {
      key += "xl";
    } else {
      key += `${i - 1}xl`;
    }

    let currentMinSize = fluidConfig.minSize;
    let currentMaxSize = fluidConfig.maxSize;
    for (let j = 0; j < i; j++) {
      currentMinSize *= fluidConfig.minScale;
      currentMaxSize *= fluidConfig.maxScale;
    }

    newItemPool.push({
      key: key,
      value: calcFluid(
        currentMinSize,
        currentMaxSize,
        fluidConfig.minViewport,
        fluidConfig.maxViewport,
      ),
    });
  }

  let newItems = newItemPool.map((item) => ({
    value: nanoid(7),
    var: {
      key: item.key,
      value: item.value,
    },
    defaultExpanded: true,
    // onSelect: (e: Event) => {
    //     e.preventDefault()
    // },
    onToggle: (e: Event) => {
      e.preventDefault();
    },
  }));

  if (parentItem) {
    if (!parentItem.children) {
      parentItem.children = [];
    }
    newItems.forEach((newItem) => {
      const existingItem = parentItem.children!.find((item) => item.var.key === newItem.var.key);
      if (existingItem) {
        existingItem.var.value = newItem.var.value;
      } else {
        parentItem.children!.push(newItem);
      }
    });
  } else {
    newItems.forEach((newItem) => {
      const existingItem: any = items.value.find((item) => item.var.key === newItem.var.key);
      if (existingItem) {
        existingItem.var.value = newItem.var.value;
      } else {
        items.value.push(newItem);
      }
    });
  }
}

async function openFluidCalculator() {
  const slideover = overlay.create(FluidCalculatorSlideover, { destroyOnClose: true });
  const instance = slideover.open();
  const fluidData = await instance.result;

  if (!fluidData) {
    toast.add({
      title: __("Cancelled", "windpress"),
      description: __("Fluid spacing generation was cancelled.", "windpress"),
      icon: "lucide:wand-sparkles",
      color: "info",
    });
    return;
  }

  generateFluid(fluidData);

  toast.add({
    title: __("Generated", "windpress"),
    description: __("Fluid spacing have been generated successfully.", "windpress"),
    icon: "lucide:wand-sparkles",
    color: "success",
  });
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
    id="wizard-spacing"
    class="min-h-[calc(100svh-var(--wp-admin--admin-bar--height))]"
  >
    <UDashboardNavbar
      :title="i18n.__('Spacing', 'wizard')"
      :toggle="false"
      :ui="{ title: 'text-sm' }"
    >
      <template #title>
        <UIcon name="lucide:align-horizontal-space-around" class="size-5" />
        {{ i18n.__("Spacing", "wizard") }}
        <UBadge variant="soft" color="neutral">--spacing-*</UBadge>
        <UTooltip
          :text="
            i18n.__('Spacing and sizing utilities like px-4, max-h-16, and many more', 'windpress')
          "
        >
          <span class="text-xs opacity-60 font-normal">
            {{
              i18n.__(
                "Spacing and sizing utilities like px-4, max-h-16, and many more",
                "windpress",
              )
            }}
          </span>
        </UTooltip>
      </template>

      <template #right>
        <UTooltip :text="i18n.__('Fluid generator', 'windpress')">
          <UButton
            icon="lucide:wand-sparkles"
            color="neutral"
            variant="subtle"
            @click="openFluidCalculator"
          />
        </UTooltip>
        <UTooltip :delay-duration="0" :text="i18n.__('Add new item', 'windpress')">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-plus"
            @click="addSpacingNext()"
          />
        </UTooltip>
        <UTooltip :text="i18n.__('Help', 'windpress')">
          <UButton
            icon="i-lucide-circle-help"
            color="neutral"
            variant="soft"
            to="https://tailwindcss.com/docs/theme#theme-variable-namespaces"
            target="_blank"
          />
        </UTooltip>
      </template>
    </UDashboardNavbar>

    <div class="flex-1 overflow-y-auto p-4">
      <!-- Onboard / Empty state when no spacing is defined -->
      <div
        v-if="items.length === 0"
        class="flex flex-col items-center justify-center h-full text-center"
      >
        <UIcon name="lucide:align-horizontal-space-around" class="size-12 text-primary/50 mb-4" />
        <h3 class="text-lg font-semibold text-highlighted mb-2">
          {{ i18n.__("No spacing defined", "windpress") }}
        </h3>
        <p class="text-dimmed mb-6 max-w-sm">
          {{
            i18n.__(
              "Start building your spacing system by adding individual spacing values or generating fluid spacing scales.",
              "windpress",
            )
          }}
        </p>
        <div class="flex gap-2">
          <UButton
            :label="i18n.__('Add Spacing', 'windpress')"
            icon="lucide:plus"
            color="primary"
            variant="subtle"
            @click="addSpacingNext()"
          />
          <UButton
            :label="i18n.__('Generate Fluid', 'windpress')"
            icon="lucide:wand-sparkles"
            variant="ghost"
            @click="openFluidCalculator"
          />
        </div>
      </div>

      <!-- Spacing tree when spacing exists -->
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
            :on-add-next="addSpacingNext"
            :on-add-child="addSpacingChild"
            :on-delete="deleteSpacing"
          />
        </template>
      </UTree>
    </div>
  </UDashboardPanel>
</template>
