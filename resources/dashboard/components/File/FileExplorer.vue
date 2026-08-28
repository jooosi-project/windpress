<script setup lang="ts">
import { onMounted, computed, ref, watch } from "vue";
import { useVolumeStore } from "@/dashboard/stores/volume";
import { useSettingsStore } from "@/dashboard/stores/settings";
import path from "path";

import type { TreeItem } from "@nuxt/ui";

import type { Entry } from "@/dashboard/stores/volume";

const volumeStore = useVolumeStore();
const settingsStore = useSettingsStore();

const emit = defineEmits<{
  delete: [entry: Entry];
  rename: [entry: Entry];
  reset: [entry: Entry];
}>();

const selectedFilePath = ref<TreeItem | undefined>(undefined);

watch(selectedFilePath, (value) => {
  volumeStore.activeViewEntryRelativePath = value?.value ?? null;
});

function recursiveTreeNodeWalkAndInsert(trees: TreeItem[], entry: Entry, rootPath?: string) {
  const relativePath = rootPath
    ? path.relative(rootPath, entry.relative_path)
    : entry.relative_path;
  const parts = relativePath.split("/");
  const currentPart = parts.shift();
  const isFile = parts.length === 0;

  if (isFile) {
    trees.push({
      label: currentPart,
      value: entry.relative_path,
      icon: `vscode-icons:file-type-${entry.relative_path === "main.css" ? "tailwind" : path.extname(entry.relative_path).replace(".", "")}`,
      // slot: entry.relative_path !== 'main.css' ? 'tree-file' : undefined,
      slot: "tree-file",
      entry,
    });
    return;
  }

  let tree = trees.find((tree) => tree.label === currentPart);

  if (!tree) {
    tree = {
      label: currentPart,
      children: [],
      onSelect: (e: Event) => {
        e.preventDefault();
      },
    };
    trees.push(tree);
  }

  recursiveTreeNodeWalkAndInsert(
    tree.children || (tree.children = []),
    entry,
    rootPath ? path.join(rootPath, currentPart || "") : currentPart || "",
  );
}

const files = computed(() => {
  let trees: TreeItem[] = [];

  volumeStore.data.entries.forEach((entry: Entry) => {
    if (entry.hidden) {
      return;
    }

    recursiveTreeNodeWalkAndInsert(trees, entry);
  });

  // sort the trees to have folders first
  trees.sort((a, b) => {
    if (a.children && !b.children) {
      return -1;
    }
    if (!a.children && b.children) {
      return 1;
    }

    return a.label && b.label ? a.label.localeCompare(b.label) : 0;
  });

  return trees;
});

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
  const walk = (tree: TreeItem) => {
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

onMounted(() => {
  if (volumeStore.activeViewEntryRelativePath) {
    switchToEntry(volumeStore.activeViewEntryRelativePath);
  }
});
</script>

<template>
  <div class="overflow-y-auto divide-y divide-(--ui-border)">
    <!-- <UTree :items="files" v-model="selectedFilePath" /> -->
    <UTree :items="files" v-model="selectedFilePath" :get-key="(item) => item.value ?? item.label">
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
          <div class="flex items-center gap-1.5 w-full">
            <UIcon v-if="item.icon" :name="item.icon" class="shrink-0 size-5" />
            {{ item.label }}
          </div>
        </UContextMenu>
      </template>
    </UTree>
  </div>
</template>
