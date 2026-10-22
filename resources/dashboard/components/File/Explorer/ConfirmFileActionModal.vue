<script setup lang="ts">
import path from "path";
import { useColorMode } from "@vueuse/core";
import { computed } from "vue";
import { highlightCode } from "@/packages/core/windpress/highlight";

const props = defineProps<{
  filePath: string;
  fileContent?: string;
  actionYes: string;
  actionNo?: string;
}>();

const colorMode = useColorMode();

const snippet = computed(() => {
  if (!props.fileContent) {
    return;
  }

  const fileExt = path.extname(props.filePath).replace(".", "");

  return highlightCode(
    props.fileContent,
    fileExt === "css" ? "css" : "javascript",
    colorMode.value === "dark" ? "dark" : "light",
  );
});
const emit = defineEmits<{ close: [boolean] }>();
</script>

<template>
  <UModal :close="{ onClick: () => emit('close', false) }">
    <template #title>
      {{
        i18n.sprintf(
          i18n.__('Are you sure you want to %s the "%s" file?', "windpress"),
          actionYes,
          filePath,
        )
      }}
    </template>

    <template #body v-if="fileContent">
      <div class="flex">
        <div v-html="snippet" class="flex [&>pre]:p-4 [&>pre]:mr-6"></div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :label="i18n.__('cancel', 'windpress')"
          @click="emit('close', false)"
          class="capitalize"
        />
        <UButton
          color="error"
          variant="soft"
          :label="actionYes"
          @click="emit('close', true)"
          class="capitalize"
        />
      </div>
    </template>
  </UModal>
</template>
