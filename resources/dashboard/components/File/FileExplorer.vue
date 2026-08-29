<script setup lang="ts">
import { onBeforeUnmount, onMounted, computed, ref, watch } from 'vue';
import { __ } from '@wordpress/i18n';
import { useVolumeStore } from "@/dashboard/stores/volume";
import { useSettingsStore } from "@/dashboard/stores/settings";
import path from "path";
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

import type { TreeItem } from "@nuxt/ui";

import type { Entry } from "@/dashboard/stores/volume";
import DraggableFileTreeItem from '@/dashboard/components/File/Explorer/DraggableFileTreeItem.vue';

interface FileTreeItem extends TreeItem {
  value: string;
  parentPath: string;
  entry?: Entry;
  isFolder?: boolean;
}

type FileDropInstruction = 'reorder-above' | 'reorder-below' | 'make-child';

interface FileTreeDropTargetData {
  type: 'windpress-tree-item';
  path: string;
  parentPath: string;
  isFolder: boolean;
  instruction: FileDropInstruction;
}

const volumeStore = useVolumeStore();
const settingsStore = useSettingsStore();

const props = withDefaults(
  defineProps<{
    enableDragAndDrop?: boolean;
  }>(),
  {
    enableDragAndDrop: true,
  },
);

const emit = defineEmits<{
  delete: [entry: Entry];
  rename: [entry: Entry];
  reset: [entry: Entry];
  'create-file': [folderPath: string];
  'create-folder': [folderPath: string];
  move: [entry: Entry, folderPath: string];
}>();

const selectedFilePath = ref<FileTreeItem | undefined>(undefined);
const draggedPath = ref<string | null>(null);
let dragAndDropCleanup: (() => void) | undefined;

watch(selectedFilePath, (value) => {
  volumeStore.activeViewEntryRelativePath = value?.value ?? null;
});

function isDirectoryEntry(entry: Entry): boolean {
  return entry.directory === true;
}

function recursiveTreeNodeWalkAndInsert(trees: FileTreeItem[], entry: Entry): void {
  const parts = entry.relative_path.split('/').filter(Boolean);
  if (parts.length === 0) {
    return;
  }

  let currentTrees = trees;
  let parentPath = '';
  const isDirectory = isDirectoryEntry(entry);

  parts.forEach((part, index) => {
    const currentPath = parentPath ? `${parentPath}/${part}` : part;
    const isLeaf = index === parts.length - 1;

    if (isLeaf && !isDirectory) {
      currentTrees.push({
        label: part || entry.name,
        value: entry.relative_path,
        parentPath,
        icon: `vscode-icons:file-type-${entry.relative_path === 'main.css' ? 'tailwind' : path.extname(entry.relative_path).replace('.', '')}`,
        slot: 'tree-file',
        entry,
        isFolder: false,
      });
      return;
    }

    let tree = currentTrees.find(
      (candidate) => candidate.value === currentPath && candidate.isFolder,
    );

    if (!tree) {
      tree = {
        label: part,
        value: currentPath,
        parentPath,
        children: [],
        defaultExpanded: true,
        isFolder: true,
        slot: 'tree-folder',
        entry: isLeaf && isDirectory ? entry : undefined,
        onSelect: (e: Event) => {
          e.preventDefault();
        },
      };
      currentTrees.push(tree);
    } else if (isLeaf && isDirectory) {
      tree.entry = entry;
    }

    parentPath = currentPath;
    currentTrees = tree.children as FileTreeItem[];
  });
}

const files = computed(() => {
  const trees: FileTreeItem[] = [];

  volumeStore.data.entries.forEach((entry: Entry) => {
    if (entry.hidden) {
      return;
    }

    recursiveTreeNodeWalkAndInsert(trees, entry);
  });

  sortTree(trees);

  return trees;
});

function sortTree(trees: FileTreeItem[]): void {
  trees.sort((a, b) => {
    if (a.isFolder && !b.isFolder) {
      return -1;
    }
    if (!a.isFolder && b.isFolder) {
      return 1;
    }

    return a.label && b.label ? a.label.localeCompare(b.label) : 0;
  });

  trees.forEach((tree) => {
    if (tree.isFolder && tree.children) {
      sortTree(tree.children as FileTreeItem[]);
    }
  });
}

watch(
  () => volumeStore.activeViewEntryRelativePath,
  (value) => {
    if (!value) {
      selectedFilePath.value = undefined;
      return;
    }

    switchToEntry(value);
  },
);

function switchToEntry(value: string) {
  // walk the tree and select the file
  const walk = (tree: FileTreeItem): boolean => {
    if (tree.value === value) {
      selectedFilePath.value = tree;
      return true;
    }

    if (tree.children) {
      for (const child of tree.children) {
        if (walk(child)) {
          return true;
        }
      }
    }

    return false;
  };

  for (const tree of files.value) {
    if (walk(tree)) {
      break;
    }
  }
}

function getMovableEntry(relativePath: string): Entry | undefined {
  const entry = volumeStore.data.entries.find(
    (candidate: Entry) => candidate.relative_path === relativePath && !candidate.hidden,
  );

  if (!entry || entry.readonly || entry.relative_path === "main.css") {
    return undefined;
  }

  return entry;
}

function getDropTarget(
  location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } },
): FileTreeDropTargetData | null {
  const target = location.current.dropTargets[0];

  if (!target || target.data.type !== 'windpress-tree-item') {
    return null;
  }

  const { path: targetPath, parentPath, isFolder, instruction } = target.data;
  if (
    typeof targetPath !== 'string' ||
    typeof parentPath !== 'string' ||
    typeof isFolder !== 'boolean' ||
    (instruction !== 'reorder-above' &&
      instruction !== 'reorder-below' &&
      instruction !== 'make-child')
  ) {
    return null;
  }

  return {
    type: 'windpress-tree-item',
    path: targetPath,
    parentPath,
    isFolder,
    instruction,
  };
}

function handleDrop(sourcePath: string, target: FileTreeDropTargetData | null): void {
  const entry = getMovableEntry(sourcePath);
  if (!entry || !target) {
    return;
  }

  if (target.instruction === 'make-child' && !target.isFolder) {
    return;
  }

  const folderPath =
    target.instruction === 'make-child' ? target.path : target.parentPath;

  const fileName = sourcePath.split("/").pop();
  if (!fileName) {
    return;
  }

  const destinationPath = folderPath ? `${folderPath}/${fileName}` : fileName;
  if (destinationPath === sourcePath) {
    return;
  }

  emit("move", entry, folderPath);
}

function getFolderContextMenu(folderPath: string) {
  return [
    {
      label: __('New File', 'windpress'),
      icon: 'i-lucide-file-plus',
      onSelect: () => emit('create-file', folderPath),
    },
    {
      label: __('New Folder', 'windpress'),
      icon: 'i-lucide-folder-plus',
      onSelect: () => emit('create-folder', folderPath),
    },
  ];
}

onMounted(() => {
  if (volumeStore.activeViewEntryRelativePath) {
    switchToEntry(volumeStore.activeViewEntryRelativePath);
  }

  if (!props.enableDragAndDrop) {
    return;
  }

  dragAndDropCleanup = monitorForElements({
    canMonitor: ({ source }) => source.data.type === 'windpress-file',
    onDragStart: ({ source }) => {
      draggedPath.value = typeof source.data.path === 'string' ? source.data.path : null;
    },
    onDrop: ({ source, location }) => {
      const sourcePath = typeof source.data.path === 'string' ? source.data.path : null;
      if (sourcePath) {
        handleDrop(sourcePath, getDropTarget(location));
      }

      draggedPath.value = null;
    },
  });
});

onBeforeUnmount(() => {
  dragAndDropCleanup?.();
});
</script>

<template>
  <div class="min-h-full overflow-y-auto divide-y divide-(--ui-border)">
    <UTree
      :items="files"
      v-model="selectedFilePath"
      :get-key="(item) => item.value ?? item.label"
      :ui="{ link: 'p-0' }"
    >
      <template
        #tree-folder="{
          item,
          expanded,
          selected,
        }: { item: FileTreeItem; expanded: boolean; selected: boolean }"
      >
        <UContextMenu :items="getFolderContextMenu(item.value)">
          <DraggableFileTreeItem
            :path="item.value"
            :label="item.label || item.value"
            :parent-path="item.parentPath"
            is-folder
            :expanded="expanded"
            :selected="selected"
            :is-dragged="draggedPath === item.value"
            :enable-drag-and-drop="props.enableDragAndDrop"
          />
        </UContextMenu>
      </template>
      <template #tree-file="{ item }: { item: TreeItem }">
        <UContextMenu
          :items="[
            {
              label: 'Reset',
              icon: 'lucide:file-minus-2',
              disabled:
                item.entry.relative_path !== 'main.css' &&
                !(
                  Number(settingsStore.virtualOptions('general.tailwindcss.version', 4).value) ===
                    4 && item.entry.relative_path === 'wizard.css'
                ),
              onSelect: () => {
                emit('reset', item.entry);
              },
            },
            {
              label: 'Rename',
              icon: 'i-lucide-edit',
              disabled: item.entry.relative_path === 'main.css',
              onSelect: () => {
                emit('rename', item.entry);
              },
            },
            {
              label: 'Delete',
              icon: 'i-lucide-trash-2',
              disabled: item.entry.relative_path === 'main.css',
              onSelect: () => {
                emit('delete', item.entry);
              },
            },
          ]"
        >
          <DraggableFileTreeItem
            :path="item.value as string"
            :label="item.label || item.value"
            :icon="item.icon"
            :parent-path="(item as FileTreeItem).parentPath"
            :can-drag="!!getMovableEntry(item.value as string)"
            :is-dragged="draggedPath === item.value"
            :enable-drag-and-drop="props.enableDragAndDrop"
          />
        </UContextMenu>
      </template>
    </UTree>
  </div>
</template>
