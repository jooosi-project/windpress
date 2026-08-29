<script setup lang="ts">
import { __, sprintf } from "@wordpress/i18n";
import { computed, ref } from "vue";
import { type Entry, useVolumeStore } from "@/dashboard/stores/volume";

const props = withDefaults(
  defineProps<{
    parentPath?: string;
  }>(),
  {
    parentPath: "",
  },
);

const volumeStore = useVolumeStore();

const emit = defineEmits<{
  close: [{ folderPath: string }?];
}>();

const folderName = ref("");
const error = ref<string | boolean>(false);

const folderPath = computed(() =>
  props.parentPath && folderName.value
    ? `${props.parentPath}/${folderName.value}`
    : folderName.value,
);

function confirm() {
  error.value = false;

  const name = folderName.value.trim();
  if (!name) {
    error.value = __("Folder name is required", "windpress");
    return;
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    error.value = __(
      "Only alphanumeric characters, dashes, underscores, and dots are allowed",
      "windpress",
    );
    return;
  }

  folderName.value = name;

  const targetPath = folderPath.value;
  const alreadyExists = volumeStore.data.entries.some(
    (entry: Entry) =>
      entry.hidden !== true &&
      (entry.relative_path === targetPath || entry.relative_path.startsWith(`${targetPath}/`)),
  );

  if (alreadyExists) {
    error.value = sprintf(__('A folder named "%s" already exists', "windpress"), targetPath);
    return;
  }

  emit("close", { folderPath: targetPath });
}
</script>

<template>
  <UModal :close="{ onClick: () => emit('close') }">
    <template #title>
      {{ i18n.__("Create New Folder", "windpress") }}
    </template>

    <template #body>
      <UFormField
        :label="i18n.__('Folder name', 'windpress')"
        required
        :description="
          props.parentPath
            ? sprintf(i18n.__('Create inside %s', 'windpress'), props.parentPath)
            : i18n.__('Create in the workspace root', 'windpress')
        "
        :error="error"
      >
        <UInput v-model="folderName" placeholder="components" class="w-full" autofocus />
      </UFormField>
    </template>

    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :label="i18n.__('cancel', 'windpress')"
          @click="emit('close')"
          class="capitalize"
        />
        <UButton
          color="primary"
          variant="soft"
          :label="i18n.__('Submit', 'windpress')"
          @click="confirm"
          class="capitalize"
        />
      </div>
    </template>
  </UModal>
</template>
