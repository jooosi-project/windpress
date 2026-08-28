<script setup lang="ts">
import { useSettingsStore } from "@/dashboard/stores/settings";

const settingsStore = useSettingsStore();
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UTooltip :text="i18n.__('Back to Integrations', 'windpress')">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            :to="{ name: 'settings.integrations' }"
          />
        </UTooltip>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-package" class="size-5" />
          <h2 class="text-xl font-semibold">{{ i18n.__("Kadence WP Settings", "windpress") }}</h2>
          <UBadge variant="soft" color="primary">@kadence</UBadge>
        </div>
      </div>
      <UTooltip :text="i18n.__('Help', 'windpress')">
        <UButton
          icon="i-lucide-circle-help"
          color="neutral"
          variant="soft"
          to="https://windpress.jooo.si/docs/guide/integrations/kadence"
          target="_blank"
        />
      </UTooltip>
    </div>

    <!-- Compile Integration -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-cpu" class="size-5 text-primary" />
            <h3 class="text-sm font-medium">{{ i18n.__("Compile Integration", "windpress") }}</h3>
            <UTooltip :text="i18n.__('Help', 'windpress')">
              <UButton
                icon="i-lucide-circle-help"
                color="neutral"
                size="sm"
                variant="soft"
                to="https://windpress.jooo.si/docs/guide/integrations/kadence"
                target="_blank"
              />
            </UTooltip>
          </div>
          <USwitch
            v-model="
              settingsStore.virtualOptions(`integration.kadence.compile.enabled`, true).value
            "
          />
        </div>
      </template>

      <div class="space-y-3">
        <p class="text-sm text-muted">
          {{
            i18n.__(
              "Enable CSS compilation for Kadence WP theme and blocks. This processes Tailwind classes found in Kadence content and generates the necessary CSS. Requires the Gutenberg/Block Editor integration to be enabled.",
              "windpress",
            )
          }}
        </p>
      </div>
    </UCard>
  </div>
</template>
