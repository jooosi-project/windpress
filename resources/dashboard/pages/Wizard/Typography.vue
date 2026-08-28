<script setup lang="ts">
import { onBeforeRouteLeave } from "vue-router";
import type { NavigationMenuItem } from "@nuxt/ui";
import { inject, onBeforeMount, ref, watch, type Ref } from "vue";
import { type WizardTheme } from "@/dashboard/composables/useWizard";
import { useWizardTree } from "@/dashboard/composables/useWizardTree";
import { useWizardDragDrop } from "@/dashboard/composables/useWizardDragDrop";
import WizardTreeItem from "@/dashboard/components/Wizard/WizardTreeItem.vue";
import {
  default as FluidCalculatorSlideover,
  calcFluid,
  type FluidCalculatorData,
} from "@/dashboard/components/Wizard/FluidCalculatorSlideover.vue";
import { __ } from "@wordpress/i18n";
import { nanoid } from "nanoid";

const overlay = useOverlay();
const toast = useToast();

const theme = inject("theme") as Ref<WizardTheme>;
const activeTab = ref("text");

// Text Tree
const textTreeLogic = useWizardTree("text", theme);
const {
  expandedTree: expandedTreeText,
  items: textItems,
  updateThemeFromItems: updateTextTheme,
  findItemByUid: findTextItem,
  addChild: addTextChild,
  addNext: addTextNext,
  deleteItem: deleteTextItem,
  initializeItems: initializeTextItems,
  findOrCreateItemByKey: findOrCreateItemByKeyText,
} = textTreeLogic;

const textDragDropLogic = useWizardDragDrop(textItems, updateTextTheme, findTextItem);
const {
  shouldBeDimmed: shouldBeDimmedText,
  wasRecentlyMoved: wasRecentlyMovedText,
  isDescendantOf: isDescendantOfText,
} = textDragDropLogic;

// Font Tree
const fontTreeLogic = useWizardTree("font", theme);
const {
  expandedTree: expandedTreeFont,
  items: fontItems,
  updateThemeFromItems: updateFontTheme,
  findItemByUid: findFontItem,
  addChild: addFontChild,
  addNext: addFontNext,
  deleteItem: deleteFontItem,
  initializeItems: initializeFontItems,
} = fontTreeLogic;

const fontDragDropLogic = useWizardDragDrop(fontItems, updateFontTheme, findFontItem);
const {
  shouldBeDimmed: shouldBeDimmedFont,
  wasRecentlyMoved: wasRecentlyMovedFont,
  isDescendantOf: isDescendantOfFont,
} = fontDragDropLogic;

// Watch for changes in each namespace
watch(
  () => theme.value.namespaces.text,
  () => {
    initializeTextItems();
  },
  { deep: true },
);

watch(
  () => theme.value.namespaces.font,
  () => {
    initializeFontItems();
  },
  { deep: true },
);

// Navigation links for UTabs
const links = ref<NavigationMenuItem[]>([
  {
    label: __("Text Size", "windpress"),
    icon: "lucide:a-large-small",
    value: "text",
  },
  {
    label: __("Font Family", "windpress"),
    icon: "lucide:type",
    value: "font",
  },
]);

function addTextChildHandler(uid: string) {
  addTextChild(uid);
}

function addTextNextHandler(uid: string) {
  addTextNext(uid);
}

function addFontChildHandler(uid: string) {
  addFontChild(uid);
}

function addFontNextHandler(uid: string) {
  addFontNext(uid);
}

function deleteText(uid: string) {
  deleteTextItem(uid);
}

function deleteFont(uid: string) {
  deleteFontItem(uid);
}

function addNext() {
  if (activeTab.value === "text") {
    addTextNext();
  } else if (activeTab.value === "font") {
    addFontNext();
  }
}

function generateFluid(fluidConfig: FluidCalculatorData) {
  let parentItem = null;

  let newItemPool = [];

  const prefix = fluidConfig.miscPrefix
    .trim()
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .replace(/[^a-zA-Z0-9-]/g, "_");

  if (prefix) {
    parentItem = findOrCreateItemByKeyText(prefix);
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
      const existingItem: any = textItems.value.find((item) => item.var.key === newItem.var.key);
      if (existingItem) {
        existingItem.var.value = newItem.var.value;
      } else {
        textItems.value.push(newItem);
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
  initializeTextItems();
  initializeFontItems();
});

onBeforeRouteLeave((_, __, next) => {
  updateTextTheme();
  updateFontTheme();
  next();
});
</script>

<template>
  <UDashboardPanel
    id="wizard-typography"
    class="min-h-[calc(100svh-var(--wp-admin--admin-bar--height))]"
  >
    <UDashboardNavbar
      :title="__('Typography', 'wizard')"
      :toggle="false"
      :ui="{ title: 'text-sm' }"
    >
      <template #title>
        <UIcon name="lucide:a-large-small" class="size-5" />
        {{ __("Typography", "wizard") }}
        <UBadge variant="soft" color="neutral">--text-* / --font-*</UBadge>
        <UTooltip
          :text="
            __(
              'Font size utilities like text-xl and font family utilities like font-sans',
              'windpress',
            )
          "
        >
          <span class="text-xs opacity-60 font-normal">
            {{
              __(
                "Font size utilities like text-xl and font family utilities like font-sans",
                "windpress",
              )
            }}
          </span>
        </UTooltip>
      </template>

      <template #right>
        <UTooltip v-if="activeTab === 'text'" :text="i18n.__('Fluid generator', 'windpress')">
          <UButton
            icon="lucide:wand-sparkles"
            color="neutral"
            variant="subtle"
            @click="openFluidCalculator"
          />
        </UTooltip>
        <UTooltip :delay-duration="0" :text="i18n.__('Add new item', 'windpress')">
          <UButton color="neutral" variant="subtle" icon="i-lucide-plus" @click="addNext()" />
        </UTooltip>
        <UTooltip :text="__('Help', 'windpress')">
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

    <UTabs
      variant="link"
      :content="false"
      v-model="activeTab"
      :items="links"
      class=""
      :ui="{ list: 'px-4 sm:px-6  zzzzzzzzz' }"
    />

    <div v-if="activeTab === 'text'" class="flex-1 overflow-y-auto p-4">
      <!-- Onboard / Empty state when no text items exist -->
      <div
        v-if="textItems.length === 0"
        class="flex flex-col items-center justify-center h-full text-center"
      >
        <UIcon name="lucide:a-large-small" class="size-12 text-primary/50 mb-4" />
        <h3 class="text-lg font-semibold text-highlighted mb-2">
          {{ __("No text sizes defined", "windpress") }}
        </h3>
        <p class="text-dimmed mb-6 max-w-sm">
          {{
            __(
              "Start building your text size system by adding individual text sizes or generating fluid text scales.",
              "windpress",
            )
          }}
        </p>
        <div class="flex gap-2">
          <UButton
            :label="__('Add Text Size', 'windpress')"
            icon="lucide:plus"
            color="primary"
            variant="subtle"
            @click="addTextNext()"
          />
          <UButton
            :label="__('Generate Fluid', 'windpress')"
            icon="lucide:wand-sparkles"
            variant="ghost"
            @click="openFluidCalculator"
          />
        </div>
      </div>

      <!-- Text Size TreeItem when items exist -->
      <UTree
        v-else
        :items="textItems"
        :get-key="(item) => String(item.value)"
        :ui="{ link: 'p-0' }"
        :expanded="expandedTreeText"
      >
        <template #item="{ item, level }">
          <WizardTreeItem
            :item="item"
            :level="level || 0"
            :should-be-dimmed="shouldBeDimmedText"
            :was-recently-moved="wasRecentlyMovedText"
            :is-descendant-of="isDescendantOfText"
            :on-add-next="addTextNextHandler"
            :on-add-child="addTextChildHandler"
            :on-delete="deleteText"
          />
        </template>
      </UTree>
    </div>

    <div v-if="activeTab === 'font'" class="flex-1 overflow-y-auto p-4">
      <!-- Onboard / Empty state when no font items exist -->
      <div
        v-if="fontItems.length === 0"
        class="flex flex-col items-center justify-center h-full text-center"
      >
        <UIcon name="lucide:type" class="size-12 text-primary/50 mb-4" />
        <h3 class="text-lg font-semibold text-highlighted mb-2">
          {{ __("No font families defined", "windpress") }}
        </h3>
        <p class="text-dimmed mb-6 max-w-sm">
          {{
            __(
              "Start building your font family system by adding individual font families for your typography.",
              "windpress",
            )
          }}
        </p>
        <div class="flex gap-2">
          <UButton
            :label="__('Add Font Family', 'windpress')"
            icon="lucide:plus"
            color="primary"
            variant="subtle"
            @click="addFontNext()"
          />
        </div>
      </div>

      <!-- Font Family TreeItem when items exist -->
      <UTree v-else :items="fontItems" :ui="{ link: 'p-0' }" :expanded="expandedTreeFont">
        <template #item="{ item, level }">
          <WizardTreeItem
            :item="item"
            :level="level || 0"
            :should-be-dimmed="shouldBeDimmedFont"
            :was-recently-moved="wasRecentlyMovedFont"
            :is-descendant-of="isDescendantOfFont"
            :on-add-next="addFontNextHandler"
            :on-add-child="addFontChildHandler"
            :on-delete="deleteFont"
          />
        </template>
      </UTree>
    </div>
  </UDashboardPanel>
</template>
