<script setup lang="ts">
import { __, sprintf } from "@wordpress/i18n";
import { ref, watch } from "vue";
import { type Entry, useVolumeStore } from "@/dashboard/stores/volume";

const volumeStore = useVolumeStore();

const emit = defineEmits<{
  close: [string?];
}>();

// prop
const props = defineProps<{
  filePath: string;
}>();

// const filePath = ref<string>('')
const filePath = ref<string>(props.filePath);

const error = ref<string | boolean>(false);

watch(
  () => filePath.value,
  () => {
    error.value = false;
  },
);

function confirm() {
  error.value = false;

  if (!filePath.value) {
    error.value = __("Filename is required", "windpress");
    return;
  }

  if (!filePath.value.endsWith(".css") && !filePath.value.endsWith(".js")) {
    error.value = __("File extension must be .css or .js", "windpress");
    return;
  }

  if (!/^[a-zA-Z0-9_.\-/]+$/.test(filePath.value)) {
    error.value = __(
      "Only alphanumeric, dash, underscore, forward slash, and dot are allowed",
      "windpress",
    );
    return;
  }

  if (
    volumeStore.data.entries.find(
      (entry: Entry) => entry.relative_path === `${filePath.value}` && entry.hidden !== true,
    )
  ) {
    error.value = sprintf(__('A file named "%s" already exists', "windpress"), filePath.value);
    return;
  }

  emit("close", filePath.value);
}
</script>

<template>
  <UModal :close="{ onClick: () => emit('close') }">
    <template #title>
      {{ i18n.__("Rename File", "windpress") }}
    </template>

    <template #body>
      <!-- previous name section -->

      <UFormField
        label="Old Filename"
        :description="i18n.__('The previous filename', 'windpress')"
        class="mb-2"
      >
        <UInput :value="props.filePath" :disabled="true" class="w-full" />
      </UFormField>

      <UFormField
        label="New Filename"
        required
        :description="i18n.__('Filename may include a path. (css or js)', 'windpress')"
        :error="error"
      >
        <UInput v-model="filePath" placeholder="theme/color.css" class="w-full" />
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
