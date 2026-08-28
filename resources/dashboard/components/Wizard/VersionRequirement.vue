<script setup lang="ts">
import { __ } from "@wordpress/i18n";
</script>

<template>
  <UDashboardPanel class="min-h-[calc(100svh-var(--wp-admin--admin-bar--height))]">
    <div class="flex flex-col items-center justify-center h-full p-8 text-center">
      <div class="max-w-md mx-auto">
        <UIcon name="lucide:info" class="size-16 text-primary mx-auto mb-6" />

        <h2 class="text-2xl font-bold text-highlighted mb-4">
          {{ __("Tailwind CSS v4 Required", "windpress") }}
        </h2>

        <p class="text-dimmed mb-6 leading-relaxed">
          {{
            __(
              "The Wizard feature is only available when using Tailwind CSS version 4. Please switch to Tailwind CSS v4 in your settings to access this feature.",
              "windpress",
            )
          }}
        </p>

        <div class="space-y-4">
          <UButton
            :label="__('Go to Settings', 'windpress')"
            color="primary"
            icon="lucide:settings"
            :to="{ name: 'settings.general' }"
          />

          <div class="text-sm text-dimmed">
            <ULink
              to="https://windpress.jooo.si/docs/guide/configuration/tailwind-version"
              target="_blank"
              class="underline hover:no-underline"
            >
              {{ __("Learn more about Tailwind version configuration", "windpress") }}
            </ULink>
          </div>
        </div>
      </div>
    </div>
  </UDashboardPanel>
</template>
