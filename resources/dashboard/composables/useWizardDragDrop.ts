import { ref, watchEffect, type Ref } from "vue";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";

export interface Instruction {
  type: "reorder-above" | "reorder-below" | "make-child" | "reparent";
  currentLevel?: number;
  indentPerLevel?: number;
  desiredLevel?: number;
}

export function useWizardDragDrop(
  items: Ref<any[]>,
  updateThemeFromItems: () => void,
  findItemByUid: (items: any[], targetUid: string) => any,
) {
  const draggedItemId = ref<string | null>(null);
  const recentlyMovedItemId = ref<string | null>(null);

  function extractInstruction(data: any): Instruction | null {
    if (data.instruction) {
      return data.instruction;
    }

    if (data.type) {
      return {
        type: data.type,
        currentLevel: data.currentLevel,
        indentPerLevel: data.indentPerLevel,
        desiredLevel: data.desiredLevel,
      };
    }

    return null;
  }

  function removeItem(data: any[], id: string): boolean {
    for (let i = 0; i < data.length; i++) {
      if (data[i].value === id) {
        data.splice(i, 1);
        return true;
      }
      if (data[i].children && removeItem(data[i].children!, id)) {
        return true;
      }
    }
    return false;
  }

  function insertBefore(data: any[], targetId: string, newItem: any): boolean {
    for (let i = 0; i < data.length; i++) {
      if (data[i].value === targetId) {
        data.splice(i, 0, newItem);
        return true;
      }
      if (data[i].children && insertBefore(data[i].children!, targetId, newItem)) {
        return true;
      }
    }
    return false;
  }

  function insertAfter(data: any[], targetId: string, newItem: any): boolean {
    for (let i = 0; i < data.length; i++) {
      if (data[i].value === targetId) {
        data.splice(i + 1, 0, newItem);
        return true;
      }
      if (data[i].children && insertAfter(data[i].children!, targetId, newItem)) {
        return true;
      }
    }
    return false;
  }

  function insertChild(data: any[], targetId: string, newItem: any): boolean {
    for (let i = 0; i < data.length; i++) {
      if (data[i].value === targetId) {
        if (!data[i].children) {
          data[i].children = [];
        }
        data[i].children!.unshift(newItem);
        return true;
      }
      if (data[i].children && insertChild(data[i].children!, targetId, newItem)) {
        return true;
      }
    }
    return false;
  }

  function getPathToItem(
    data: any[],
    targetId: string,
    parentIds: string[] = [],
  ): string[] | undefined {
    for (const item of data) {
      if (item.value === targetId) {
        return parentIds;
      }
      if (item.children) {
        const result = getPathToItem(item.children, targetId, [...parentIds, item.value!]);
        if (result) return result;
      }
    }
    return undefined;
  }

  function handleDragAndDrop(itemId: string, targetId: string, instruction: Instruction) {
    const sourceItem = findItemByUid(items.value, itemId);
    const targetItem = findItemByUid(items.value, targetId);

    if (!sourceItem || !targetItem) {
      console.warn(
        "Source or target item not found in current namespace - cross-namespace drag operations are not supported",
        {
          sourceItem: !!sourceItem,
          targetItem: !!targetItem,
          itemId,
          targetId,
        },
      );
      return;
    }

    removeItem(items.value, itemId);

    if (instruction.type === "reorder-above") {
      insertBefore(items.value, targetId, sourceItem);
    } else if (instruction.type === "reorder-below") {
      insertAfter(items.value, targetId, sourceItem);
    } else if (instruction.type === "make-child") {
      insertChild(items.value, targetId, sourceItem);
    } else if (instruction.type === "reparent") {
      const path = getPathToItem(items.value, targetId);
      if (
        path &&
        instruction.desiredLevel !== undefined &&
        path.length > instruction.desiredLevel
      ) {
        const desiredParentId = path[instruction.desiredLevel];
        insertAfter(items.value, desiredParentId, sourceItem);
      }
    }

    updateThemeFromItems();

    recentlyMovedItemId.value = itemId;
    setTimeout(() => {
      recentlyMovedItemId.value = null;
    }, 1000);
  }

  function isDescendantOf(sourceId: string, targetId: string): boolean {
    const sourceItem = findItemByUid(items.value, sourceId);
    if (!sourceItem) return false;

    function checkChildren(item: any): boolean {
      if (!item.children) return false;

      for (const child of item.children) {
        if (child.value === targetId) {
          return true;
        }
        if (checkChildren(child)) {
          return true;
        }
      }
      return false;
    }

    return checkChildren(sourceItem);
  }

  function shouldBeDimmed(itemId: string): boolean {
    if (!draggedItemId.value) return false;
    return itemId === draggedItemId.value || isDescendantOf(draggedItemId.value, itemId);
  }

  function wasRecentlyMoved(itemId: string): boolean {
    return recentlyMovedItemId.value === itemId;
  }

  // Setup drag and drop monitoring
  watchEffect((onCleanup) => {
    const dndFunction = combine(
      monitorForElements({
        onDrop(args) {
          const { location, source } = args;
          if (!location.current.dropTargets.length) return;

          const itemId = source.data.id as string;
          const target = location.current.dropTargets[0];
          const targetId = target.data.id as string;

          const instruction: Instruction | null = extractInstruction(target.data);

          if (instruction !== null) {
            handleDragAndDrop(itemId, targetId, instruction);
          }
        },
      }),
    );

    onCleanup(() => {
      dndFunction();
    });
  });

  watchEffect((onCleanup) => {
    const dndFunction = combine(
      monitorForElements({
        onDragStart({ source }) {
          draggedItemId.value = source.data.id as string;
        },
        onDrop(args) {
          const { location, source } = args;

          draggedItemId.value = null;

          if (!location.current.dropTargets.length) {
            return;
          }

          const itemId = source.data.id as string;
          const target = location.current.dropTargets[0];
          const targetId = target.data.id as string;

          const instruction = extractInstruction(target.data);

          if (instruction !== null) {
            handleDragAndDrop(itemId, targetId, instruction);
          } else {
            handleDragAndDrop(itemId, targetId, { type: "reorder-below" });
          }
        },
      }),
    );

    onCleanup(() => {
      draggedItemId.value = null;
      dndFunction();
    });
  });

  return {
    draggedItemId,
    recentlyMovedItemId,
    shouldBeDimmed,
    wasRecentlyMoved,
    isDescendantOf,
    handleDragAndDrop,
  };
}
