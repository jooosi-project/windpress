import dayjs from "dayjs";
import { nanoid } from "nanoid";
import {
  compressToUint8Array,
  decompressFromUint8Array,
} from "@windpress/lz-string";
import { __, sprintf } from "@wordpress/i18n";

import { type Entry, useVolumeStore } from "@/dashboard/stores/volume";
import { useSettingsStore } from "@/dashboard/stores/settings";
import { useThemeJsonStore } from "@/dashboard/stores/themeJson";
import { encodeVFSContainer } from "@/packages/core/tailwindcss/vfs";
import ConfirmFileActionModal from "@/dashboard/components/File/Explorer/ConfirmFileActionModal.vue";
import ConfirmVolumeImportModal from "@/dashboard/components/File/Explorer/ConfirmVolumeImportModal.vue";
import NewFileFormModal from "@/dashboard/components/File/Explorer/NewFileFormModal.vue";
import RenameFileFormModal from "@/dashboard/components/File/Explorer/RenameFileFormModal.vue";

export type VolumeSFSFile = {
  entries: Entry[];
  _windpress: boolean;
  _version: string;
  _wp_version: string;
  _timestamp: number;
  _uid: string;
  _type: string;
};

export function useFileAction() {
  const volumeStore = useVolumeStore();
  const settingsStore = useSettingsStore();
  const themeJsonStore = useThemeJsonStore();
  const toast = useToast();
  const overlay = useOverlay();

  async function deleteFile(entry: Entry) {
    if (entry.readonly) {
      toast.add({
        title: __("Error", "windpress"),
        description: sprintf(
          __('File "%s" is read-only and not deletable', "windpress"),
          entry.relative_path,
        ),
        color: "error",
        icon: "i-lucide-trash",
      });
      return;
    }

    if (entry.relative_path === "main.css") {
      toast.add({
        title: __("Error", "windpress"),
        description: sprintf(
          __('File "%s" is required for the WindPress to work and not deletable', "windpress"),
          entry.relative_path,
        ),
        color: "error",
        icon: "i-lucide-trash",
      });
      return;
    }

    const deleteModal = overlay.create(ConfirmFileActionModal, {
      destroyOnClose: true,
      props: {
        filePath: entry.relative_path,
        fileContent: entry.content,
        actionYes: __("delete", "windpress"),
      },
    });

    const shouldDelete = await deleteModal.open().result;

    if (!shouldDelete) {
      toast.add({
        title: __("Canceled", "windpress"),
        description: sprintf(__('File "%s" is not deleted', "windpress"), entry.relative_path),
        color: "info",
        icon: "i-lucide-trash",
      });
      return;
    }

    volumeStore.softDeleteEntry(entry);

    toast.add({
      title: __("Success", "windpress"),
      description: sprintf(__('File "%s" deleted', "windpress"), entry.relative_path),
      color: "success",
      icon: "i-lucide-trash",
    });
  }

  async function resetFile(entry: Entry) {
    const resetModal = overlay.create(ConfirmFileActionModal, {
      destroyOnClose: true,
      props: {
        filePath: entry.relative_path,
        fileContent: entry.content,
        actionYes: __("reset", "windpress"),
      },
    });

    const shouldReset = await resetModal.open().result;

    if (!shouldReset) {
      toast.add({
        title: __("Canceled", "windpress"),
        description: sprintf(__('File "%s" is not reset', "windpress"), entry.relative_path),
        color: "info",
        icon: "lucide:file-minus-2",
      });
      return;
    }

    volumeStore.resetEntry(entry);

    toast.add({
      title: __("Success", "windpress"),
      description: sprintf(__('File "%s" reset', "windpress"), entry.relative_path),
      color: "success",
      icon: "lucide:file-minus-2",
    });

    save().then(() => {
      volumeStore.doPull();
    });
  }

  async function save() {
    const toastData: Omit<Partial<Toast>, "id"> = {
      title: __("Saving...", "windpress"),
      description: __("Please wait while we save your changes.", "windpress"),
      duration: 0,
      icon: "lucide:loader-circle",
      close: false,
      color: "neutral",
      ui: {
        icon: "animate-spin",
      },
    };

    if (toast.toasts.value.find((t) => t.id === "file-editor.doSave")) {
      toast.update("file-editor.doSave", {
        ...toastData,
      });
    } else {
      toast.add({
        id: "file-editor.doSave",
        ...toastData,
      });
    }

    return volumeStore
      .doPush()
      .then(() => {
        toast.update("file-editor.doSave", {
          title: __("Saved", "windpress"),
          description: __("Your changes have been saved.", "windpress"),
          icon: "i-lucide-save",
          color: "success",
          duration: undefined,
          close: true,
          ui: {
            icon: undefined,
          },
        });

        if (Number(settingsStore.virtualOptions("general.tailwindcss.version", 4).value) === 4) {
          themeJsonStore.doPush();
        }
      })
      .catch((err) => {
        const errorMessage =
          err instanceof Error && err.message
            ? err.message
            : __('An error occurred while saving your changes.', 'windpress');

        toast.update("file-editor.doSave", {
          title: __("Error", "windpress"),
          description: errorMessage,
          icon: "i-lucide-save",
          color: "error",
          duration: undefined,
          close: true,
          ui: {
            icon: undefined,
          },
        });

        // TODO: log error
      })
      .finally(() => {
        const channel = new BroadcastChannel("windpress");

        ["windpress/observer", "windpress/intellisense"].forEach((target) => {
          channel.postMessage({
            source: "windpress/dashboard",
            target,
            task: "windpress.code-editor.saved",
            payload: {
              volume: encodeVFSContainer(volumeStore.getKVEntries()),
            },
          });
        });

        channel.close();
      });
  }

  function exportVolume() {
    const data = {
      entries: volumeStore.data.entries,
      _windpress: true,
      _version: window.windpress._version,
      _wp_version: window.windpress._wp_version,
      _timestamp: new Date().getTime(),
      _uid: nanoid(),
      _type: "sfs",
    } as VolumeSFSFile;

    const compressed = compressToUint8Array(JSON.stringify(data));

    const blob = new Blob([compressed], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `sfs-${dayjs().format("YYYYMMDDHHmmss")}.windpress`;
    a.click();
    URL.revokeObjectURL(url);

    toast.add({
      title: __("Exported", "windpress"),
      description: __("SFS volume data exported", "windpress"),
      color: "success",
      icon: "i-lucide-download",
    });
  }

  async function importVolume(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target || !target.files || target.files.length === 0) {
      return;
    }

    const file = target.files[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith(".windpress")) {
      toast.add({
        title: __("SFS Import", "windpress"),
        description: __("Invalid file format", "windpress"),
        color: "error",
        icon: "i-lucide-upload",
      });

      return;
    }

    let data: VolumeSFSFile;

    try {
      data = JSON.parse(
        decompressFromUint8Array(new Uint8Array(await file.arrayBuffer())) || "{}",
      );

      if (!data._windpress || data._type !== "sfs") {
        throw new Error(__("File is not a valid WindPress file", "windpress"));
      }
    } catch (error) {
      toast.add({
        title: __("SFS Import", "windpress"),
        description:
          error instanceof Error ? error.message : __("An unknown error occurred", "windpress"),
        color: "error",
        icon: "i-lucide-upload",
      });

      return;
    }

    const importConfirmModal = overlay.create(ConfirmVolumeImportModal, {
      destroyOnClose: true,
      props: {
        data,
      },
    });

    const shouldImport = await importConfirmModal.open().result;

    if (!shouldImport) {
      toast.add({
        title: __("Canceled", "windpress"),
        description: __("SFS import canceled", "windpress"),
        color: "info",
        icon: "i-lucide-upload",
      });

      target.value = "";
      return;
    }

    toast.add({
      id: "file-import.doImport",
      title: __("Importing...", "windpress"),
      description: __("Please wait while we import the data.", "windpress"),
      icon: "lucide:loader-circle",
      close: false,
      duration: 0,
      color: "neutral",
      ui: {
        icon: "animate-spin",
      },
    });

    // delay the execution to show the loading toast
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // Volume handler require to check the signature of existing files,
      // so remove the `signature` property where the `handler` property is "internal"
      const entries = data.entries.map((entry: Entry) => {
        if (entry.signature && entry.handler === "internal") {
          const { signature: _signature, ...rest } = entry;
          return rest;
        }

        return entry;
      });

      volumeStore.data.entries = entries;

      // logStore.add({
      //     type: 'success',
      //     message: 'SFS data imported',
      // });

      toast.update("file-import.doImport", {
        title: __("Success", "windpress"),
        description: __("SFS data imported. Remember to save the changes.", "windpress"),
        color: "success",
        icon: "i-lucide-upload",
        duration: undefined,
        close: true,
        ui: {
          icon: undefined,
        },
      });

      target.value = "";
    } catch (error) {
      toast.update("file-import.doImport", {
        title: __("Error", "windpress"),
        description:
          error instanceof Error ? error.message : __("An unknown error occurred", "windpress"),
        color: "error",
        icon: "i-lucide-upload",
        close: true,
        duration: undefined,
        ui: {
          icon: undefined,
        },
      });

      target.value = "";
    }
  }

  async function addNewFile() {
    const newFileModal = overlay.create(NewFileFormModal, {
      destroyOnClose: true,
    });

    const result = await newFileModal.open().result;

    if (!result) {
      toast.add({
        title: __("Canceled", "windpress"),
        description: __("New file creation canceled", "windpress"),
        color: "info",
        icon: "i-lucide-plus",
      });

      return;
    }

    try {
      volumeStore.addNewEntry(result.filePath, result.handler);
      toast.add({
        title: __("Success", "windpress"),
        description: sprintf(__('File "%s" created', "windpress"), result.filePath),
        color: "success",
        icon: "i-lucide-plus",
      });
    } catch (error) {
      toast.add({
        title: __("Error", "windpress"),
        description:
          error instanceof Error ? error.message : __("An unknown error occurred", "windpress"),
        color: "error",
        icon: "i-lucide-plus",
      });
    }
  }

  async function renameFile(entry: Entry) {
    const newFileName = await overlay
      .create(RenameFileFormModal, {
        destroyOnClose: true,
        props: {
          filePath: entry.relative_path,
        },
      })
      .open().result;

    if (!newFileName) {
      toast.add({
        title: __("Canceled", "windpress"),
        description: __("File rename canceled", "windpress"),
        color: "info",
        icon: "i-lucide-edit",
      });

      return;
    }

    try {
      volumeStore.renameEntry(entry, newFileName);
      toast.add({
        title: __("Success", "windpress"),
        description: sprintf(
          __('File "%s" renamed to "%s"', "windpress"),
          entry.relative_path,
          newFileName,
        ),
        color: "success",
        icon: "i-lucide-edit",
      });
    } catch (error) {
      toast.add({
        title: __("Error", "windpress"),
        description:
          error instanceof Error ? error.message : __("An unknown error occurred", "windpress"),
        color: "error",
        icon: "i-lucide-edit",
      });
    }
  }

  return {
    deleteFile,
    resetFile,
    save,
    exportVolume,
    importVolume,
    addNewFile,
    renameFile,
  };
}
