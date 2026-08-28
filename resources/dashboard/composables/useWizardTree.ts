import { ref, computed, type Ref } from "vue";
import { nanoid, customAlphabet } from "nanoid";
import type { TreeItem } from "@nuxt/ui";
import type { WizardTheme } from "./useWizard";

export interface WizardTreeItem extends TreeItem {
  var: {
    key: string;
    value: string | any;
  };
}

const randomId = () => customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 6)();

export function generateId() {
  let id = randomId();
  while (id.match(/^\d/)) {
    id = randomId();
  }
  return `${id}`;
}

export function useWizardTree(namespace: keyof WizardTheme["namespaces"], theme: Ref<WizardTheme>) {
  const items = ref<WizardTreeItem[]>([]);

  const expandedTree = computed(() => {
    const result: string[] = [];

    function traverse(items: any[]): void {
      for (const item of items) {
        if (item.value) {
          result.push(item.value);
        }
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    }

    traverse(items.value);
    return result;
  });

  function namespaceToTree(namespaceData: any): WizardTreeItem[] {
    return Object.entries(namespaceData || {})
      .map(([key, value]) => {
        if (key === "$value") {
          return null;
        }

        const item: WizardTreeItem = {
          value: nanoid(7),
          var: {
            key: key,
            value: value,
          },
          defaultExpanded: true,
          // onSelect: (e: Event) => {
          //     e.preventDefault()
          // },
          onToggle: (e: Event) => {
            e.preventDefault();
          },
        };

        if (typeof value === "object" && value !== null) {
          item.children = namespaceToTree(value);
          const valueObj = value as any;
          if (valueObj.$value !== undefined) {
            item.var.value = valueObj.$value;
          } else {
            item.var.value = "";
          }
        } else {
          item.var.value = value;
        }

        return item;
      })
      .filter((item): item is WizardTreeItem => item !== null);
  }

  function updateThemeFromItems() {
    try {
      const convertItem = (item: any): any => {
        if (!item.var?.key) return null;

        if (item.children && item.children.length > 0) {
          const result: any = {};
          item.children.forEach((child: any) => {
            const converted = convertItem(child);
            if (converted) {
              Object.assign(result, converted);
            }
          });

          if (item.var.value !== undefined && item.var.value !== null) {
            result.$value = item.var.value;
          }

          return { [item.var.key]: result };
        } else if (item.var.value !== undefined && item.var.value !== null) {
          return { [item.var.key]: item.var.value };
        }
        return null;
      };

      const newNamespace: any = {};
      items.value.forEach((item: any) => {
        const converted = convertItem(item);
        if (converted) {
          Object.assign(newNamespace, converted);
        }
      });

      theme.value.namespaces[namespace] = newNamespace;
    } catch (error) {
      console.error("Error updating theme from items:", error);
    }
  }

  function findItemByUid(itemList: any[], targetUid: string): any {
    for (const item of itemList) {
      if (item.value === targetUid) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = findItemByUid(item.children, targetUid);
        if (found) return found;
      }
    }
  }

  function findParentItem(itemList: any[], target: any): any {
    for (const item of itemList) {
      if (item.children && item.children.includes(target)) {
        return item;
      }
      if (item.children) {
        const found = findParentItem(item.children, target);
        if (found) return found;
      }
    }
  }

  function findOrCreateItemByKey(
    keyPath: string,
    createIfMissing: boolean = true,
  ): WizardTreeItem | null {
    const keys = keyPath.split("-");
    let currentItems = items.value as WizardTreeItem[];
    let currentItem: WizardTreeItem | null = null;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const isLastKey = i === keys.length - 1;

      // Try to find existing item with this key
      let foundItem = currentItems.find((item: WizardTreeItem) => item.var.key === key);

      if (!foundItem) {
        if (!createIfMissing) {
          return null;
        }

        // Create new item
        const newItem: WizardTreeItem = {
          value: nanoid(7),
          var: {
            key: key,
            value: "",
          },
          defaultExpanded: true,
          children: [],
          // onSelect: (e: Event) => {
          //     e.preventDefault()
          // },
          onToggle: (e: Event) => {
            e.preventDefault();
          },
        };

        // Add to current level
        currentItems.push(newItem);
        foundItem = newItem;
      }

      currentItem = foundItem;

      // If not the last key, prepare for next level
      if (!isLastKey) {
        if (!currentItem.children) {
          currentItem.children = [];
        }
        currentItems = currentItem.children as WizardTreeItem[];
      }
    }

    return currentItem;
  }

  function addChild(uid: string, customKey?: string, customValue?: string | any) {
    const currentItem = findItemByUid(items.value, uid);
    if (!currentItem) {
      console.error("Item not found for uid:", uid);
      return;
    }

    const newItem: WizardTreeItem = {
      value: nanoid(7),
      var: {
        key: customKey || "",
        value: customValue !== undefined ? customValue : "",
      },
      defaultExpanded: true,
      children: [],
      // onSelect: (e: Event) => {
      //     e.preventDefault()
      // },
      onToggle: (e: Event) => {
        e.preventDefault();
      },
    };

    if (currentItem.children) {
      currentItem.children.push(newItem);
    } else {
      currentItem.children = [newItem];
    }
  }

  function addNext(uid?: string, customKey?: string, customValue?: string | any) {
    const newItem: WizardTreeItem = {
      value: nanoid(7),
      var: {
        key: customKey || "",
        value: customValue !== undefined ? customValue : "",
      },
      defaultExpanded: true,
      children: [],
      // onSelect: (e: Event) => {
      //     e.preventDefault()
      // },
      onToggle: (e: Event) => {
        e.preventDefault();
      },
    };

    // If no uid provided, add to root level
    if (!uid) {
      (items.value as any[]).push(newItem);
      return;
    }

    const currentItem = findItemByUid(items.value, uid);
    if (!currentItem) {
      return;
    }

    const parentItem = findParentItem(items.value, currentItem);

    if (parentItem && parentItem.children) {
      const index = parentItem.children?.indexOf(currentItem);
      if (index !== undefined && index >= 0) {
        parentItem.children.splice(index + 1, 0, newItem);
      }
    } else {
      const currentIndex = (items.value as any[]).indexOf(currentItem);
      if (currentIndex >= 0) {
        (items.value as any[]).splice(currentIndex + 1, 0, newItem);
      }
    }
  }

  function deleteItem(uid: string) {
    const currentItem = findItemByUid(items.value, uid);
    if (!currentItem) {
      console.error("Item not found for uid:", uid);
      return;
    }

    const parentItem = findParentItem(items.value, currentItem);

    if (parentItem && parentItem.children) {
      const index = parentItem.children.indexOf(currentItem);
      if (index >= 0) {
        parentItem.children.splice(index, 1);
      }
    } else {
      const currentIndex = (items.value as any[]).indexOf(currentItem);
      if (currentIndex >= 0) {
        (items.value as any[]).splice(currentIndex, 1);
      }
    }
  }

  function initializeItems() {
    items.value = namespaceToTree(theme.value.namespaces[namespace]);
  }

  return {
    expandedTree,
    items,
    namespaceToTree,
    updateThemeFromItems,
    findItemByUid,
    findOrCreateItemByKey,
    addChild,
    addNext,
    deleteItem,
    initializeItems,
  };
}
