<script setup lang="ts">
import dayjs from "dayjs";
import type { VolumeSFSFile } from "@/dashboard/composables/useFileAction";

const props = defineProps<{
  data: VolumeSFSFile;
}>();

const emit = defineEmits<{ close: [boolean] }>();
</script>

<template>
  <UModal :close="{ onClick: () => emit('close', false) }">
    <template #title>
      {{ i18n.__("Import SFS volume", "windpress") }}
    </template>

    <template #body>
      <div class="flex flex-col gap-4 text-(--ui-text)">
        <div>
          <div class="font-bold uppercase my-2">{{ i18n.__("File info", "windpress") }}</div>

          <table class="w-full">
            <tbody>
              <tr>
                <td class="font-semibold w-1/3">{{ i18n.__("WindPress version", "windpress") }}</td>
                <td class="">:</td>
                <td class="">{{ props.data._version }}</td>
              </tr>
              <tr>
                <td class="font-semibold w-1/5">{{ i18n.__("WP Version", "windpress") }}</td>
                <td class="">:</td>
                <td class="">{{ props.data._wp_version }}</td>
              </tr>
              <tr>
                <td class="font-semibold w-1/5">{{ i18n.__("Exported on", "windpress") }}</td>
                <td class="">:</td>
                <td class="">{{ dayjs(props.data._timestamp).format("YYYY-MM-DD HH:mm:ss") }}</td>
              </tr>
              <tr>
                <td class="font-semibold w-1/5">{{ i18n.__("Entries", "windpress") }}</td>
                <td class="">:</td>
                <td class="">{{ props.data.entries.length }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {{
          i18n.__(
            "This will overwrite all existing files. Are you sure you want to continue?",
            "windpress",
          )
        }}
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
          color="warning"
          variant="soft"
          :label="i18n.__('Yes, continue', 'windpress')"
          @click="emit('close', true)"
          class="capitalize"
        />
      </div>
    </template>
  </UModal>
</template>
