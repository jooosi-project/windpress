<script setup lang="ts">
import { __, sprintf } from "@wordpress/i18n";
import { onMounted, ref, watch } from "vue";
import { type Entry, useVolumeStore } from "@/dashboard/stores/volume";
import { useApi } from "@/dashboard/library/api";

const volumeStore = useVolumeStore();
const api = useApi();

const emit = defineEmits<{
  close: [{ filePath: string; handler?: string }?];
}>();

const filePath = ref<string>("");
const handler = ref<string | undefined>();
const handlers = ref<Array<{ value?: string; label: string; description?: string }>>([]);
const isLoadingHandlers = ref(false);

const error = ref<string | boolean>(false);

watch(
  () => filePath.value,
  () => {
    error.value = false;
  },
);

onMounted(async () => {
  try {
    isLoadingHandlers.value = true;
    const response = await api.request("/admin/volume/handlers", { method: "GET" });
    handlers.value = response.data.handlers;
  } catch (err) {
    console.error(err);
  } finally {
    isLoadingHandlers.value = false;
  }
});

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

  if (
    !/^[a-zA-Z0-9_.\-/]+$/.test(filePath.value) &&
    (handler.value === "internal" || !handler.value)
  ) {
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

  emit("close", { filePath: filePath.value, handler: handler.value });
}
</script>

<template>
  <UModal :close="{ onClick: () => emit('close') }">
    <template #title>
      {{ i18n.__("Create New File", "windpress") }}
    </template>

    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField
          label="Filename"
          required
          :description="i18n.__('Filename may include a path. (css or js)', 'windpress')"
          :error="error"
        >
          <UInput v-model="filePath" placeholder="theme/color.css" class="w-full" />
        </UFormField>

        <UFormField
          v-if="handlers.length > 0"
          :label="i18n.__('Handler', 'windpress')"
          :description="
            i18n.__('The handler determines how the file is processed and served.', 'windpress')
          "
          :help="
            i18n.__('If no handler is selected, the internal handler will be used.', 'windpress')
          "
        >
          <USelect
            :items="handlers"
            :loading="isLoadingHandlers"
            value-key="value"
            class="w-full"
            placeholder="Choose Handler..."
            v-model="handler"
          >
            <template v-if="handler" #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-circle-x"
                aria-label="Clear input"
                @click.prevent.stop="handler = undefined"
                @mousedown.prevent.stop
                @touchstart.prevent.stop
                class="pointer-events-auto"
              />
            </template>
          </USelect>
        </UFormField>
      </div>
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
