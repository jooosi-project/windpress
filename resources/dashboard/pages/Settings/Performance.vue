<script setup lang="ts">
import { __ } from "@wordpress/i18n";
import { computed, onBeforeMount, ref } from "vue";
import { useBusyStore } from "@/dashboard/stores/busy";
import { useSettingsStore } from "@/dashboard/stores/settings";
import dayjs from "dayjs";
import prettyBytes from "pretty-bytes";
import { useApi } from "@/dashboard/library/api";
import { useGenerateCache } from "@/dashboard/composables/useGenerateCache";

const api = useApi();
const { generateCache } = useGenerateCache();

const settingsStore = useSettingsStore();
const busyStore = useBusyStore();

type CSS_Cache = {
  last_generated: number | null;
  last_full_build: number | null;
  file_url: string | null;
  file_size: number | null;
};

const css_cache = ref<CSS_Cache>({
  last_generated: null,
  last_full_build: null,
  file_url: null,
  file_size: null,
});

function pullCacheInfo() {
  api.get("admin/settings/cache/index").then((resp: { data: { cache: CSS_Cache } }) => {
    css_cache.value = resp.data.cache;
  });
}

async function doGenerateCache() {
  generateCache(() => {
    pullCacheInfo();
  });
}

onBeforeMount(() => {
  pullCacheInfo();
});

const isCachedMode = computed(
  () => settingsStore.virtualOptions("performance.mode", "hybrid").value === "cached",
);
</script>

<template>
  <UForm id="performance" :state="{}">
    <UPageCard
      :title="i18n.__('Performance', 'windpress')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
    </UPageCard>
    <UPageCard variant="subtle">
      <UFormField
        :label="i18n.__('Rendering modes', 'windpress')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'flex-1', wrapper: 'flex-1', root: 'rootzzz' }"
      >
        <div class="shrink grid grid-cols-3 gap-3">
          <label
            class="flex items-center justify-center rounded-md p-3 font-semibold flex-1 bg-(--ui-bg-accented) hover:ring-(--ui-text)/50 hover:ring-1 has-checked:bg-[#0073e0] has-checked:text-white"
          >
            <input
              v-model="settingsStore.virtualOptions('performance.mode', 'hybrid').value"
              type="radio"
              name="performance_mode"
              value="cached"
              class="sr-only"
            />
            <span>{{ i18n.__("Cached", "windpress") }}</span>
          </label>
          <label
            class="flex items-center justify-center rounded-md p-3 font-semibold flex-1 bg-(--ui-bg-accented) hover:ring-(--ui-text)/50 hover:ring-1 has-checked:bg-[#0073e0] has-checked:text-white"
          >
            <input
              v-model="settingsStore.virtualOptions('performance.mode', 'hybrid').value"
              type="radio"
              name="performance_mode"
              value="hybrid"
              class="sr-only"
            />
            <span>{{ i18n.__("Hybrid", "windpress") }}</span>
          </label>
          <label
            class="flex items-center justify-center rounded-md p-3 font-semibold flex-1 bg-(--ui-bg-accented) hover:ring-(--ui-text)/50 hover:ring-1 has-checked:bg-[#0073e0] has-checked:text-white"
          >
            <input
              v-model="settingsStore.virtualOptions('performance.mode', 'hybrid').value"
              type="radio"
              name="performance_mode"
              value="compiler"
              class="sr-only"
            />
            <span>{{ i18n.__("Compiler", "windpress") }}</span>
          </label>
        </div>
        <template #description>
          <p>
            {{ i18n.__("Choose the rendering strategy based on your needs.", "windpress") }}
          </p>
        </template>
      </UFormField>
      <div class="bg-muted/50 border border-default rounded-lg p-3">
        <div class="flex items-start gap-2">
          <UIcon name="lucide:lightbulb" class="size-4 text-info mt-0.5 flex-shrink-0" />
          <div class="text-xs text-muted">
            <p class="font-medium mb-1">{{ __("Available modes:", "windpress") }}</p>
            <div class="space-y-1">
              <p>
                <code class="text-xs bg-elevated px-1 py-0.5 rounded font-semibold">{{
                  i18n.__("Cached")
                }}</code>
                -
                {{
                  i18n.__(
                    "Load cached CSS when available, otherwise fallback to Compiler.",
                    "windpress",
                  )
                }}
              </p>
              <p>
                <code class="text-xs bg-elevated px-1 py-0.5 rounded font-semibold">{{
                  i18n.__("Hybrid")
                }}</code>
                -
                {{
                  i18n.__(
                    "Inline cached CSS when available, then run the Compiler to regenerate the style.",
                    "windpress",
                  )
                }}
              </p>
              <p>
                <code class="text-xs bg-elevated px-1 py-0.5 rounded font-semibold">{{
                  i18n.__("Compiler")
                }}</code>
                - {{ i18n.__("Always use the Compiler to generate the style.", "windpress") }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <USeparator />
      <template v-if="isCachedMode">
        <UFormField
          :label="i18n.__('Cached CSS loading method', 'windpress')"
          :description="
            i18n.__('Load cached CSS as an inline instead of an external file.', 'windpress')
          "
          class="flex items-center justify-between gap-4"
        >
          <USwitch
            v-model="settingsStore.virtualOptions('performance.cache.inline_load', false).value"
            :label="i18n.__('Inline Cached CSS', 'windpress')"
            :ui="{ label: 'whitespace-nowrap' }"
            class="flex-row-reverse gap-2"
          />
        </UFormField>
        <USeparator />
      </template>
      <template v-if="settingsStore.virtualOptions('general.tailwindcss.version', 4).value === 4">
        <UFormField
          :label="i18n.__('Generate source map', 'windpress')"
          :description="i18n.__('Generate the source map for the cached CSS file.', 'windpress')"
          class="flex items-center justify-between gap-4"
        >
          <USwitch
            v-model="settingsStore.virtualOptions('performance.cache.source_map', false).value"
            :label="i18n.__('Enable Source Map', 'windpress')"
            :ui="{ label: 'whitespace-nowrap' }"
            class="flex-row-reverse gap-2"
          />
        </UFormField>
        <USeparator />
      </template>
      <UFormField
        :label="i18n.__('Generate the cached CSS', 'windpress')"
        class="flex items-center justify-between gap-4"
      >
        <template #description v-if="css_cache.last_generated">
          <div class="flex gap-2 items-center">
            <div class="flex gap-2 items-center">
              <span class="font-semibold"> {{ i18n.__("Last Generated", "windpress") }}: </span>
              <span v-if="css_cache.file_size" class="flex gap-1">
                {{ dayjs(css_cache.last_generated * 1000).format("YYYY-MM-DD HH:mm:ss") }}
                <ULink :to="css_cache.file_url" target="_blank" class="underline">
                  <UIcon name="lucide:external-link" />
                </ULink>
              </span>
            </div>
            <UBadge v-if="css_cache.file_size" color="success" variant="subtle">
              {{ prettyBytes(css_cache.file_size, { maximumFractionDigits: 2, space: true }) }}
            </UBadge>
          </div>
        </template>
        <UTooltip :delay-duration="0" :text="i18n.__('Generate the cached CSS file', 'windpress')">
          <UButton
            color="primary"
            variant="subtle"
            @click="doGenerateCache"
            :disabled="busyStore.isBusy"
            :loading="
              busyStore.isBusy && busyStore.hasTask('settings.performance.cached_css.generate')
            "
          >
            {{
              busyStore.isBusy && busyStore.hasTask("settings.performance.cached_css.generate")
                ? i18n.__("Generating...", "windpress")
                : i18n.__("Generate", "windpress")
            }}
          </UButton>
        </UTooltip>
      </UFormField>
    </UPageCard>
  </UForm>
</template>
