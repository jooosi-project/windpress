<script setup lang="ts">
import "vue-color/style.css";
import { ChromePicker, tinycolor } from "vue-color";
import Color from "colorjs.io";
import { nanoid } from "nanoid";
import { onBeforeRouteLeave } from "vue-router";
import { ref, inject, onBeforeMount, watch, type Ref, nextTick } from "vue";
import { type WizardTheme } from "@/dashboard/composables/useWizard";
import { useWizardTree } from "@/dashboard/composables/useWizardTree";
import { useWizardDragDrop } from "@/dashboard/composables/useWizardDragDrop";
import WizardTreeItem from "@/dashboard/components/Wizard/WizardTreeItem.vue";
import { __ } from "@wordpress/i18n";
import masterCSSColorPalettes from "@master/colors";

const theme = inject("theme") as Ref<WizardTheme>;

const treeLogic = useWizardTree("color", theme);
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
  () => theme.value.namespaces.color,
  () => {
    initializeItems();
  },
  { deep: true },
);

function addColorChild(uid: string) {
  addChild(uid);
}

function addColorNext(uid?: string) {
  addNext(uid);
}

function deleteColor(uid: string) {
  deleteItem(uid);
}

// Predefined color palettes for quick setup
const colorPalettes = [
  {
    name: __("Brand Colors", "windpress"),
    description: __("Primary brand colors for your design system", "windpress"),
    colors: {
      primary: "oklch(58.5% 0.233 277.117)",
      secondary: "oklch(62.3% .214 259.815)",
      neutral: "oklch(55.4% 0.046 257.417)",
    },
  },
  {
    name: __("Semantic Colors", "windpress"),
    description: __("Status and feedback colors", "windpress"),
    colors: {
      success: "oklch(72.3% 0.219 149.579)",
      warning: "oklch(79.5% 0.184 86.047)",
      error: "oklch(63.7% 0.237 25.331)",
      info: "oklch(62.3% 0.214 259.815)",
    },
  },
  {
    name: __("Neutral Grayscale", "windpress"),
    description: __("A neutral grayscale palette for backgrounds, text, etc", "windpress"),
    colors: {
      "neutral-50": "oklch(0.985 0 0)",
      "neutral-100": "oklch(0.97 0 0)",
      "neutral-200": "oklch(0.922 0 0)",
      "neutral-300": "oklch(0.87 0 0)",
      "neutral-400": "oklch(0.708 0 0)",
      "neutral-500": "oklch(0.556 0 0)",
      "neutral-600": "oklch(0.439 0 0)",
      "neutral-700": "oklch(0.371 0 0)",
      "neutral-800": "oklch(0.269 0 0)",
      "neutral-900": "oklch(0.205 0 0)",
      "neutral-950": "oklch(0.145 0 0)",
    },
  },
  {
    name: __("Material Design 3", "windpress"),
    description: __("Material Design 3 color system", "windpress"),
    colors: {
      "md3-primary": "rgb(101 85 143)",
      "md3-surface-tint": "rgb(103 80 164)",
      "md3-on_primary": "rgb(255 255 255)",
      "md3-primary-container": "rgb(234 221 255)",
      "md3-on_primary-container": "rgb(79 55 139)",
      "md3-secondary": "rgb(98 91 113)",
      "md3-on_secondary": "rgb(255 255 255)",
      "md3-secondary-container": "rgb(232 222 248)",
      "md3-on_secondary-container": "rgb(74 68 88)",
      "md3-tertiary": "rgb(125 82 96)",
      "md3-on_tertiary": "rgb(255 255 255)",
      "md3-tertiary-container": "rgb(255 216 228)",
      "md3-on_tertiary-container": "rgb(99 59 72)",
      "md3-error": "rgb(179 38 30)",
      "md3-on_error": "rgb(255 255 255)",
      "md3-error-container": "rgb(249 222 220)",
      "md3-on_error-container": "rgb(140 29 24)",
      "md3-background": "rgb(254 247 255)",
      "md3-on_background": "rgb(29 27 32)",
      "md3-surface": "rgb(254 247 255)",
      "md3-on_surface": "rgb(29 27 32)",
      "md3-surface-variant": "rgb(231 224 236)",
      "md3-on_surface-variant": "rgb(73 69 79)",
      "md3-outline": "rgb(121 116 126)",
      "md3-outline-variant": "rgb(202 196 208)",
      "md3-shadow": "rgb(0 0 0)",
      "md3-scrim": "rgb(0 0 0)",
      "md3-inverse-surface": "rgb(50 47 53)",
      "md3-inverse-on_surface": "rgb(245 239 247)",
      "md3-inverse-primary": "rgb(208 188 255)",
      "md3-primary-fixed": "rgb(234 221 255)",
      "md3-on_primary-fixed": "rgb(33 0 93)",
      "md3-primary-fixed-dim": "rgb(208 188 255)",
      "md3-on_primary-fixed-variant": "rgb(79 55 139)",
      "md3-secondary-fixed": "rgb(232 222 248)",
      "md3-on_secondary-fixed": "rgb(29 25 43)",
      "md3-secondary-fixed-dim": "rgb(204 194 220)",
      "md3-on_secondary-fixed-variant": "rgb(74 68 88)",
      "md3-tertiary-fixed": "rgb(255 216 228)",
      "md3-on_tertiary-fixed": "rgb(49 17 29)",
      "md3-tertiary-fixed-dim": "rgb(239 184 200)",
      "md3-on_tertiary-fixed-variant": "rgb(99 59 72)",
      "md3-surface-dim": "rgb(222 216 225)",
      "md3-surface-bright": "rgb(254 247 255)",
      "md3-surface-container-lowest": "rgb(255 255 255)",
      "md3-surface-container-low": "rgb(247 242 250)",
      "md3-surface-container": "rgb(243 237 247)",
      "md3-surface-container-high": "rgb(236 230 240)",
      "md3-surface-container-highest": "rgb(230 224 233)",
    },
  },
  ...Object.entries(masterCSSColorPalettes).map(([name, colors]: [string, any]) => ({
    name: `${name} @ Master Colors v3`,
    description: "Master Colors v3 — A precision-crafted P3 color system designed for modern UIs", // Add description if available in your palette object
    colors: Object.fromEntries(
      Object.entries(colors).map(([key, value]) => [`${name}-${key}`, value]),
    ),
  })),
];

function addPalette(palette: (typeof colorPalettes)[0]) {
  let newItemPool = [];

  Object.entries(palette.colors).forEach(([key, value]) => {
    let parentKey = "";
    let childKey = key;

    // Check if this key contains a dash (e.g., gray-50, neutral-100)
    if (key.includes("-")) {
      const parts = key.split("-");
      if (parts.length >= 2) {
        parentKey = parts.slice(0, -1).join("-");
        childKey = parts[parts.length - 1];
      }
    }

    newItemPool.push({
      parentKey: parentKey || null,
      key: childKey,
      value: value,
    });
  });

  // Group items by parent
  const groupedItems = new Map();
  newItemPool.forEach((item) => {
    const key = item.parentKey || "__root__";
    if (!groupedItems.has(key)) {
      groupedItems.set(key, []);
    }
    groupedItems.get(key).push(item);
  });

  // Process each group
  groupedItems.forEach((groupItems, groupKey) => {
    if (groupKey === "__root__") {
      // Add items directly to root
      groupItems.forEach((item) => {
        const existingItem: any = items.value.find(
          (existingItem) => existingItem.var.key === item.key,
        );
        if (existingItem) {
          existingItem.var.value = item.value;
        } else {
          const newItem = {
            value: nanoid(7),
            var: {
              key: item.key,
              value: item.value,
            },
            defaultExpanded: true,
            onToggle: (e: Event) => {
              e.preventDefault();
            },
          };
          items.value.push(newItem);
        }
      });
    } else {
      // Find or create parent item
      const parentItem = findOrCreateItemByKey(groupKey);

      if (!parentItem.children) {
        parentItem.children = [];
      }

      groupItems.forEach((item) => {
        const existingItem = parentItem.children!.find((child) => child.var.key === item.key);
        if (existingItem) {
          existingItem.var.value = item.value;
        } else {
          const newItem = {
            value: nanoid(7),
            var: {
              key: item.key,
              value: item.value,
            },
            defaultExpanded: true,
            onToggle: (e: Event) => {
              e.preventDefault();
            },
          };
          parentItem.children!.push(newItem);
        }
      });
    }
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
    id="wizard-colors"
    class="min-h-[calc(100svh-var(--wp-admin--admin-bar--height))]"
  >
    <UDashboardNavbar
      :title="i18n.__('Colors', 'windpress')"
      :toggle="false"
      :ui="{ title: 'text-sm' }"
    >
      <template #title>
        <UIcon name="lucide:swatch-book" class="size-5" />
        {{ i18n.__("Colors", "windpress") }}
        <UBadge variant="soft" color="neutral">--color-*</UBadge>
        <UTooltip
          :text="
            i18n.__('Color utilities like bg-primary, text-accent, and border-neutral', 'windpress')
          "
        >
          <span class="text-xs opacity-60 font-normal">
            {{
              i18n.__(
                "Color utilities like bg-primary, text-accent, and border-neutral",
                "windpress",
              )
            }}
          </span>
        </UTooltip>
      </template>

      <template #right>
        <UDropdownMenu
          :items="[
            {
              label: i18n.__('Color Palettes', 'windpress'),
              type: 'label',
            },
            ...colorPalettes.map((palette) => ({
              label: palette.name,
              description: palette.description,
              icon: 'lucide:palette',
              onSelect: () => addPalette(palette),
            })),
          ]"
          :ui="{ content: 'w-64 max-h-80' }"
        >
          <UTooltip :text="i18n.__('Add color palette', 'windpress')">
            <UButton icon="lucide:palette" color="neutral" variant="subtle" />
          </UTooltip>
        </UDropdownMenu>

        <UTooltip :delay-duration="0" :text="i18n.__('Add new color', 'windpress')">
          <UButton color="neutral" variant="subtle" icon="i-lucide-plus" @click="addColorNext()" />
        </UTooltip>

        <UTooltip :text="i18n.__('Help', 'windpress')">
          <UButton
            icon="i-lucide-circle-help"
            color="neutral"
            variant="soft"
            to="https://tailwindcss.com/docs/customizing-colors"
            target="_blank"
          />
        </UTooltip>
      </template>
    </UDashboardNavbar>

    <div class="flex-1 overflow-y-auto p-4">
      <!-- Onboard / Empty state when no colors are defined -->
      <div
        v-if="items.length === 0"
        class="flex flex-col items-center justify-center h-full text-center"
      >
        <UIcon name="lucide:palette" class="size-12 text-primary/50 mb-4" />
        <h3 class="text-lg font-semibold text-highlighted mb-2">
          {{ i18n.__("No colors defined", "windpress") }}
        </h3>
        <p class="text-dimmed mb-6 max-w-sm">
          {{
            i18n.__(
              "Start building your color system by adding individual colors or choosing from predefined palettes.",
              "windpress",
            )
          }}
        </p>
        <div class="flex gap-2">
          <UButton
            :label="i18n.__('Add Color', 'windpress')"
            icon="lucide:plus"
            color="primary"
            variant="subtle"
            @click="addColorNext()"
          />
          <UDropdownMenu
            :items="
              colorPalettes.map((palette) => ({
                label: palette.name,
                description: palette.description,
                icon: 'lucide:palette',
                onSelect: () => addPalette(palette),
              }))
            "
            :ui="{ content: 'w-64 max-h-80' }"
          >
            <UButton
              :label="i18n.__('Choose Palette', 'windpress')"
              icon="lucide:palette"
              variant="ghost"
            />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Color tree when colors exist -->
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
            :on-add-next="addColorNext"
            :on-add-child="addColorChild"
            :on-delete="deleteColor"
          >
            <template #before-value="{ item }">
              <div>
                <UTooltip :text="item.var.value">
                  <div
                    :style="{ backgroundColor: item.var.value || 'var(--ui-bg-elevated)' }"
                    class="h-8 w-8 rounded border border-gray-300 dark:border-gray-600"
                  ></div>
                </UTooltip>
              </div>
            </template>

            <template #value-leading="{ item }">
              <UPopover>
                <div
                  class="h-4 w-4 rounded border border-gray-300 dark:border-gray-600"
                  :style="{ backgroundColor: item.var.value || 'var(--ui-bg-elevated)' }"
                  :title="i18n.__('Open color picker', 'windpress')"
                >
                  <span class="sr-only">{{ i18n.__("Open color picker", "windpress") }}</span>
                </div>

                <template #content>
                  <ChromePicker
                    :value="new Color(item.var.value || '#ffffff00').toString({ format: 'hex' })"
                    @input="
                      (color: string) => {
                        const prevColor = new Color(item.var.value || '#ffffff00');
                        const nextColor = new Color(color).toString({
                          format: prevColor.parseMeta.formatId,
                        });
                        item.var.value = nextColor;
                      }
                    "
                  />
                </template>
              </UPopover>
            </template>
          </WizardTreeItem>
        </template>
      </UTree>
    </div>
  </UDashboardPanel>
</template>

<style>
.vc-chrome-picker div.toggle-icon svg {
  display: inline;
}
</style>
