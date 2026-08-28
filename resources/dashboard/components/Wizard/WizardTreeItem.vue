<script setup lang="ts">
import DraggableTreeItem from "@/dashboard/pages/Wizard/DraggableTreeItem.vue";
import type { WizardTreeItem } from "@/dashboard/composables/useWizardTree";

interface Props {
  item: WizardTreeItem;
  level: number;
  shouldBeDimmed: (itemId: string) => boolean;
  wasRecentlyMoved: (itemId: string) => boolean;
  isDescendantOf: (sourceId: string, targetId: string) => boolean;
  onAddNext: (uid: string) => void;
  onAddChild: (uid: string) => void;
  onDelete?: (uid: string) => void;
}

const props = defineProps<Props>();

function handleLeftRightArrowKey(event: KeyboardEvent) {
  event.stopPropagation();
  event.stopImmediatePropagation();
}
</script>

<template>
  <DraggableTreeItem
    :item="item"
    :level="level"
    :has-children="!!(item.children && item.children.length > 0)"
    :is-last="false"
    :is-descendant-of="isDescendantOf"
    :on-delete="onDelete"
    :class="{
      'opacity-30': shouldBeDimmed(item.value || ''),
      'ring-2 ring-primary ring-offset-2 bg-primary/5': wasRecentlyMoved(item.value || ''),
    }"
    class="transition-all duration-300 ease-out rounded-lg"
  >
    <div class="flex items-center gap-2 w-full">
      <div class="drag-and-drop-handler bg-elevated rounded p-1 hover:bg-accented cursor-grab">
        <UIcon name="lucide:grip-vertical" class="size-4 text-dimmed" />
      </div>
      <slot name="leading" :item="item"></slot>
      <div>
        <UInput
          v-model="item.var.key"
          @update:model-value="
            (val) => {
              // Only allow alphanumeric characters, hyphens, and underscores
              const sanitized = val.replace(/[^a-zA-Z0-9\\-_]/g, '');
              item.var.key = sanitized;
            }
          "
          @keydown.left="handleLeftRightArrowKey"
          @keydown.right="handleLeftRightArrowKey"
          placeholder=""
          :ui="{ base: 'peer' }"
        >
          <label
            class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
          >
            <span class="inline-flex bg-default px-1">{{ i18n.__("Name") }}</span>
          </label>
        </UInput>
      </div>
      <slot name="before-value" :item="item"></slot>
      <div class="w-full">
        <UInput
          v-model="item.var.value"
          @update:model-value="
            (value) => {
              item.var.value = value;
            }
          "
          @keydown.left="handleLeftRightArrowKey"
          @keydown.right="handleLeftRightArrowKey"
          placeholder=""
          :ui="{ base: 'peer', root: 'block' }"
        >
          <label
            class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            :class="{
              'peer-placeholder-shown:ps-9 peer-focus:ps-1.5': $slots['value-leading'],
            }"
          >
            <span class="inline-flex bg-default px-1">{{ i18n.__("Value") }}</span>
          </label>

          <template v-if="$slots['value-leading']" #leading>
            <slot name="value-leading" :item="item"></slot>
          </template>
        </UInput>
      </div>
      <div>
        <UDropdownMenu
          :items="[
            {
              label: i18n.__('Add (next)', 'windpress'),
              icon: 'i-lucide-plus',
              onSelect() {
                onAddNext(item.value || '');
              },
            },
            {
              label: i18n.__('Add (child)', 'windpress'),
              icon: 'lucide:corner-down-right',
              onSelect() {
                onAddChild(item.value || '');
              },
            },
            ...(onDelete
              ? [
                  {
                    label: 'Delete',
                    icon: 'i-lucide-trash-2',
                    onSelect() {
                      onDelete!(item.value || '');
                    },
                  },
                ]
              : []),
          ]"
          :ui="{ content: 'w-48' }"
        >
          <UButton icon="lucide:ellipsis" color="neutral" variant="ghost" />
        </UDropdownMenu>
      </div>
    </div>
  </DraggableTreeItem>
</template>
