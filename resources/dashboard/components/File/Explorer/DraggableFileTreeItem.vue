<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

type FileDropInstruction = 'reorder-above' | 'reorder-below' | 'make-child';

const props = withDefaults(
  defineProps<{
    path: string;
    label: string;
    icon?: string;
    parentPath?: string;
    isFolder?: boolean;
    expanded?: boolean;
    selected?: boolean;
    isDragged?: boolean;
    canDrag?: boolean;
    enableDragAndDrop?: boolean;
  }>(),
  {
    icon: undefined,
    parentPath: '',
    isFolder: false,
    expanded: false,
    selected: false,
    isDragged: false,
    canDrag: true,
    enableDragAndDrop: true,
  },
);

const outerDropZoneRef = ref<HTMLElement | null>(null);
const draggableRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const instruction = ref<FileDropInstruction | null>(null);

function getInstruction(
  input: { clientY: number },
  element: Element,
  isFolder: boolean,
): FileDropInstruction {
  const rect = element.getBoundingClientRect();
  const relativeY = input.clientY - rect.top;

  if (isFolder && relativeY >= rect.height * 0.33 && relativeY <= rect.height * 0.67) {
    return 'make-child';
  }

  return relativeY < rect.height / 2 ? 'reorder-above' : 'reorder-below';
}

watchEffect((onCleanup) => {
  const itemPath = props.path;
  const parentPath = props.parentPath;
  const isFolder = props.isFolder;
  const canDrag = props.canDrag;
  const enableDragAndDrop = props.enableDragAndDrop;
  const outerDropZone = outerDropZoneRef.value;
  const draggableElement = draggableRef.value;
  if (!outerDropZone || !draggableElement || !enableDragAndDrop) {
    return;
  }

  const dropCleanup = dropTargetForElements({
    element: outerDropZone,
    getData: ({ input, element }) => {
      const nextInstruction = getInstruction(input, element, isFolder);
      instruction.value = nextInstruction;

      return {
        type: 'windpress-tree-item',
        path: itemPath,
        parentPath,
        isFolder,
        instruction: nextInstruction,
      };
    },
    canDrop: ({ source }) =>
      source.data.type === 'windpress-file' &&
      typeof source.data.path === 'string' &&
      source.data.path !== itemPath,
    onDrag: ({ self }) => {
      const nextInstruction = self.data.instruction;
      if (
        nextInstruction === 'reorder-above' ||
        nextInstruction === 'reorder-below' ||
        nextInstruction === 'make-child'
      ) {
        instruction.value = nextInstruction;
      }
    },
    onDragLeave: () => {
      instruction.value = null;
    },
    onDrop: () => {
      instruction.value = null;
    },
    getIsSticky: () => true,
  });

  if (isFolder || !canDrag) {
    onCleanup(dropCleanup);
    return;
  }

  const dragCleanup = draggable({
    element: draggableElement,
    getInitialData: () => ({
      type: 'windpress-file',
      path: itemPath,
    }),
    onGenerateDragPreview: ({ nativeSetDragImage }) => {
      if (!nativeSetDragImage) {
        return;
      }

      const previewContainer = document.createElement('div');
      previewContainer.className =
        'bg-default border border-default rounded-lg p-2 shadow-lg opacity-90 max-w-md font-sans';
      // Keep the preview mounted long enough for the browser to snapshot it,
      // but remove it from document flow so dragging cannot change the layout.
      previewContainer.style.position = 'fixed';
      previewContainer.style.left = '-10000px';
      previewContainer.style.top = '-10000px';
      previewContainer.style.pointerEvents = 'none';

      const itemClone = draggableElement.cloneNode(true) as HTMLElement;
      itemClone.className =
        'm-0 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm text-highlighted [&_*]:!bg-default [&_*]:!text-highlighted';
      previewContainer.appendChild(itemClone);

      document.body.appendChild(previewContainer);

      const elementRect = draggableElement.getBoundingClientRect();
      nativeSetDragImage(
        previewContainer,
        Math.min(16, elementRect.width / 2),
        elementRect.height / 2,
      );

      requestAnimationFrame(() => {
        previewContainer.remove();
      });
    },
    onDragStart: () => {
      isDragging.value = true;
    },
    onDrop: () => {
      isDragging.value = false;
    },
  });

  onCleanup(() => {
    dropCleanup();
    dragCleanup();
    instruction.value = null;
    isDragging.value = false;
  });
});
</script>

<template>
  <div
    ref="outerDropZoneRef"
    class="relative w-full px-2.5 py-1.5 transition-all duration-200 ease-out"
  >
    <div
      v-if="instruction === 'reorder-above'"
      class="pointer-events-none absolute inset-x-1 -top-px z-10 border-t-2 border-primary"
    >
      <span class="absolute -left-1 -top-1 size-2 rounded-full border-2 border-primary bg-default" />
    </div>

    <div
      v-if="instruction === 'reorder-below'"
      class="pointer-events-none absolute inset-x-1 -bottom-px z-10 border-b-2 border-primary"
    >
      <span class="absolute -left-1 -bottom-1 size-2 rounded-full border-2 border-primary bg-default" />
    </div>

    <div
      v-if="instruction === 'make-child'"
      class="pointer-events-none absolute inset-0 z-10 rounded border-2 border-primary bg-primary/10"
    >
      <span
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-primary/30 px-4 py-2 font-medium text-primary backdrop-blur-md"
      >
        {{ i18n.__('Drop to nest inside', 'windpress') }}
      </span>
    </div>

    <div
      ref="draggableRef"
      class="relative flex w-full min-w-0 select-none cursor-default items-center gap-1.5 rounded px-1.5 py-1 text-start transition-all duration-200 ease-out"
      :class="{
        'active:cursor-grabbing': !isFolder && canDrag,
        'cursor-grabbing': isDragging,
        'opacity-30': isDragged || isDragging,
        'bg-elevated': selected,
      }"
    >
      <UIcon
        :name="
          isFolder
            ? expanded
              ? 'i-lucide-folder-open'
              : 'i-lucide-folder'
            : icon || 'i-lucide-file'
        "
        class="size-5 shrink-0"
      />
      <span class="min-w-0 truncate">{{ label }}</span>
    </div>
  </div>
</template>
