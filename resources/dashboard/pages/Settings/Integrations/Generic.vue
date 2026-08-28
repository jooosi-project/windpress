<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed } from "vue";

const route = useRoute();

// Get integration ID from route params
const integrationId = computed(() => route.params.integration as string);
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
          <h2 class="text-xl font-semibold">{{ i18n.__("Unknown Integration", "windpress") }}</h2>
        </div>
      </div>
      <UTooltip :text="i18n.__('Help', 'windpress')">
        <UButton
          icon="i-lucide-circle-help"
          color="neutral"
          variant="soft"
          to="https://windpress.jooo.si/docs"
          target="_blank"
        />
      </UTooltip>
    </div>

    <!-- Coming Soon Message -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-construction" class="size-5 text-warning" />
          <h3 class="text-sm font-medium">{{ i18n.__("Settings Coming Soon", "windpress") }}</h3>
        </div>
      </template>

      <div class="space-y-3">
        <p class="text-sm text-muted">
          {{
            i18n.__(
              "Settings for this integration are currently being developed and will be available in a future update.",
              "windpress",
            )
          }}
        </p>
      </div>
    </UCard>
  </div>
</template>
