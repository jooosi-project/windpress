<script setup lang="ts">
import { ref, watchEffect } from "vue";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { unrefElement } from "@vueuse/core";
import type { TreeItem } from "@nuxt/ui";

// Local implementation of attach instruction functionality
function attachInstruction(data: any, config: any) {
  const { input, element, indentPerLevel, currentLevel } = config;

  const rect = element.getBoundingClientRect();
  const relativeY = input.clientY - rect.top;
  const relativeX = input.clientX - rect.left;
  const height = rect.height;

  let instructionType = "reorder-below";

  if (relativeY < height * 0.33) {
    instructionType = "reorder-above";
  } else if (relativeY > height * 0.67) {
    instructionType = "reorder-below";
  } else if (relativeX > indentPerLevel * 2) {
    instructionType = "make-child";
  } else {
    instructionType = "reorder-below";
  }

  return {
    ...data,
    instruction: {
      type: instructionType,
      currentLevel,
      indentPerLevel,
    },
  };
}

function extractInstruction(data: any) {
  return data.instruction || null;
}

const props = defineProps<{
  item: TreeItem;
  level: number;
  hasChildren: boolean;
  isLast: boolean;
  isDescendantOf?: (sourceId: string, targetId: string) => boolean;
  onDelete?: (uid: string) => void;
}>();

const outerDropZoneRef = ref<HTMLElement>();
const dropZoneRef = ref<HTMLElement>();
const draggableRef = ref<HTMLElement>();
const isDragging = ref(false);
const isDraggedOver = ref(false);
const instruction = ref<any>(null);

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Delete" && props.onDelete) {
    // Don't trigger delete when user is focused on input fields
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      return;
    }
    event.preventDefault();
    props.onDelete(props.item.value as string);
  }
}

watchEffect((onCleanup) => {
  const outerDropZone = unrefElement(outerDropZoneRef);
  const dropZone = unrefElement(dropZoneRef);
  const draggableElement = unrefElement(draggableRef);
  if (!outerDropZone || !dropZone || !draggableElement) return;

  const itemData = {
    id: props.item.value,
    level: props.level,
  };

  const dragHandle = draggableElement.querySelector(".drag-and-drop-handler") as HTMLElement;

  if (!dragHandle) {
    console.warn("No drag handle found for item:", props.item.value);
    return;
  }

  const dndFunction = combine(
    draggable({
      element: dragHandle,
      getInitialData: () => {
        return itemData;
      },
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        if (nativeSetDragImage) {
          const previewContainer = document.createElement("div");

          previewContainer.className =
            "bg-default border border-default rounded-lg p-2 shadow-lg opacity-90 max-w-md font-sans";

          const itemClone = draggableElement.cloneNode(true) as HTMLElement;

          itemClone.className = "m-0 py-2 px-0 [&_*]:!bg-default [&_*]:!text-highlighted";

          previewContainer.appendChild(itemClone);

          if (props.hasChildren && props.item.children?.length) {
            const childrenContainer = document.createElement("div");
            childrenContainer.className = "ml-4 pl-2 border-l-2 border-default";

            const childLabel = document.createElement("div");
            childLabel.className = "text-sm text-dimmed py-1";
            childLabel.textContent = `+ ${props.item.children.length} nested item${props.item.children.length > 1 ? "s" : ""}`;
            childrenContainer.appendChild(childLabel);

            previewContainer.appendChild(childrenContainer);
          }

          document.body.appendChild(previewContainer);

          const handleRect = dragHandle.getBoundingClientRect();

          const offsetX = handleRect.width / 2;
          const offsetY = handleRect.height / 2;

          nativeSetDragImage(previewContainer, offsetX, offsetY);

          setTimeout(() => {
            if (document.body.contains(previewContainer)) {
              document.body.removeChild(previewContainer);
            }
          }, 100);
        }
      },
      onDragStart: () => {
        isDragging.value = true;
      },
      onDrop: () => {
        isDragging.value = false;
      },
    }),

    dropTargetForElements({
      element: outerDropZone,
      getData: ({ input, element }) => {
        const data = { id: props.item.value };
        return attachInstruction(data, {
          input,
          element,
          indentPerLevel: 16,
          currentLevel: props.level,
          block: [],
        });
      },
      canDrop: ({ source }) => {
        const sourceId = source.data.id as string;
        const targetId = props.item.value as string;

        if (sourceId === targetId) {
          return false;
        }

        if (props.isDescendantOf) {
          const isDescendant = props.isDescendantOf(sourceId, targetId);
          if (isDescendant) {
            return false;
          }
        }

        return true;
      },
      onDrag: ({ self }) => {
        instruction.value = extractInstruction(self.data);
      },
      onDragEnter: ({ source }) => {
        if (source.data.id !== props.item.value) {
          isDraggedOver.value = true;
        }
      },
      onDragLeave: () => {
        isDraggedOver.value = false;
        instruction.value = null;
      },
      onDrop: () => {
        isDraggedOver.value = false;
        instruction.value = null;
      },
      getIsSticky: () => true,
    }),
  );

  onCleanup(() => dndFunction());
});
</script>

<template>
  <div
    ref="outerDropZoneRef"
    class="relative w-full px-2.5 py-1.5 transition-all duration-200 ease-out"
    :class="{
      'bg-elevated': isDraggedOver,
    }"
    @keydown="handleKeydown"
    tabindex="0"
  >
    <div
      v-if="instruction"
      class="absolute pointer-events-none border-primary transition-all duration-150 ease-out"
      :class="{
        '!border-b-2 -bottom-px left-1 right-0': instruction.type === 'reorder-below',
        '!border-t-2 -top-px left-1 right-0': instruction.type === 'reorder-above',
        '!border-2 rounded top-0 bottom-0 bg-primary/10 w-full -left-px':
          instruction.type === 'make-child',
      }"
    />

    <div
      v-if="
        instruction &&
        (instruction.type === 'reorder-below' || instruction.type === 'reorder-above')
      "
      class="absolute pointer-events-none w-2 h-2 border-2 border-primary bg-transparent rounded-full -left-1 z-10 transition-all duration-150 ease-out"
      :class="{
        '-bottom-1': instruction.type === 'reorder-below',
        '-top-1': instruction.type === 'reorder-above',
      }"
    />

    <div
      v-if="instruction && instruction.type === 'make-child'"
      class="absolute text-primary bg-primary/30 backdrop-blur-md px-4 py-2 rounded-lg pointer-events-none top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-medium whitespace-nowrap z-10 transition-all duration-150 ease-out"
    >
      Drop to nest inside
    </div>

    <div ref="dropZoneRef" class="relative w-full transition-all duration-200 ease-out">
      <div
        ref="draggableRef"
        class="relative w-full py-4 transition-all duration-200 ease-out"
        :class="{
          'is-being-dragged': isDragging,
        }"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
