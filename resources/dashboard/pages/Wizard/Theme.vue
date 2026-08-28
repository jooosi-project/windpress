<script setup lang="ts">
import { onBeforeRouteLeave } from "vue-router";
import { inject, ref, watch, type Ref } from "vue";
import { type WizardTheme } from "@/dashboard/composables/useWizard";
import { __ } from "@wordpress/i18n";

const theme = inject("theme") as Ref<WizardTheme>;

// Local form state
const formData = ref({
  isStatic: theme.value.isStatic || false,
  isInitial: theme.value.isInitial || false,
  spacing: theme.value.spacing || "",
});

// Watch for changes in the theme to update form
watch(
  () => theme.value,
  (newTheme) => {
    formData.value = {
      isStatic: newTheme.isStatic || false,
      isInitial: newTheme.isInitial || false,
      spacing: newTheme.spacing || "",
    };
  },
  { deep: true },
);

// Update theme when form changes
function updateTheme() {
  theme.value.isStatic = formData.value.isStatic;
  theme.value.isInitial = formData.value.isInitial;
  theme.value.spacing = formData.value.spacing || undefined;
}

// Auto-save on form changes
watch(
  formData,
  () => {
    updateTheme();
  },
  { deep: true },
);

onBeforeRouteLeave((_, __, next) => {
  updateTheme();
  next();
});
</script>

<template>
  <UDashboardPanel
    id="wizard-theme"
    class="min-h-[calc(100svh-var(--wp-admin--admin-bar--height))]"
  >
    <UDashboardNavbar
      :title="__('Theme Settings', 'wizard')"
      :toggle="false"
      :ui="{ title: 'text-sm' }"
    >
      <template #title>
        <UIcon name="lucide:settings" class="size-5" />
        {{ __("Theme Settings", "wizard") }}
        <UBadge variant="soft" color="neutral">@theme</UBadge>
        <UTooltip :text="__('Configure global theme settings and behavior', 'windpress')">
          <span class="text-xs opacity-60 font-normal">
            {{ __("Configure global theme settings and behavior", "windpress") }}
          </span>
        </UTooltip>
      </template>

      <template #right>
        <UTooltip :text="__('Help', 'windpress')">
          <UButton
            icon="i-lucide-circle-help"
            color="neutral"
            variant="soft"
            to="https://tailwindcss.com/docs/theme"
            target="_blank"
          />
        </UTooltip>
      </template>
    </UDashboardNavbar>

    <div class="flex-1 overflow-y-auto p-4">
      <div class="max-w-2xl mx-auto space-y-6">
        <!-- Static Theme Toggle -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="lucide:lock" class="size-5 text-warning" />
                <h3 class="text-sm font-medium">{{ __("Static Theme", "windpress") }}</h3>
                <UBadge variant="soft" color="warning">@theme static</UBadge>
              </div>
              <USwitch v-model="formData.isStatic" />
            </div>
          </template>

          <div class="space-y-3">
            <p class="text-sm text-muted">
              {{
                __(
                  "When enabled, all CSS variables will be generated even if they are not used in your content. This ensures consistency but may increase CSS size.",
                  "windpress",
                )
              }}
            </p>
            <div class="bg-muted/50 border border-default rounded-lg p-3">
              <div class="flex items-start gap-2">
                <UIcon name="lucide:info" class="size-4 text-info mt-0.5 flex-shrink-0" />
                <div class="text-xs text-muted">
                  <p class="font-medium mb-1">{{ __("Use static theme when:", "windpress") }}</p>
                  <ul class="space-y-1 text-xs">
                    <li>
                      -
                      {{
                        __(
                          "You want all theme variables available regardless of usage",
                          "windpress",
                        )
                      }}
                    </li>
                    <li>
                      - {{ __("You are building a theme or plugin for distribution", "windpress") }}
                    </li>
                    <li>- {{ __("You need predictable CSS variable names", "windpress") }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Initial Theme Toggle -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="lucide:eraser" class="size-5 text-error" />
                <h3 class="text-sm font-medium">{{ __("Disable Default Theme", "windpress") }}</h3>
                <UBadge variant="soft" color="error">--* = initial</UBadge>
              </div>
              <USwitch v-model="formData.isInitial" />
            </div>
          </template>

          <div class="space-y-3">
            <p class="text-sm text-muted">
              {{
                __(
                  'When enabled, completely disables the default Tailwind theme. All default values will be set to "initial", giving you full control over styling.',
                  "windpress",
                )
              }}
            </p>
            <div class="bg-error/10 border border-error/20 rounded-lg p-3">
              <div class="flex items-start gap-2">
                <UIcon
                  name="lucide:alert-triangle"
                  class="size-4 text-error mt-0.5 flex-shrink-0"
                />
                <div class="text-xs text-muted">
                  <p class="font-medium mb-1 text-error">
                    {{ __("Warning: Advanced users only", "windpress") }}
                  </p>
                  <p>
                    {{
                      __(
                        "This will remove all default Tailwind CSS values. You will need to define all colors, spacing, fonts, etc. yourself.",
                        "windpress",
                      )
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Spacing Multiplier -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="lucide:ruler" class="size-5 text-primary" />
              <h3 class="text-sm font-medium">{{ __("Spacing Multiplier", "windpress") }}</h3>
              <UBadge variant="soft" color="primary">--spacing</UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-muted">
              {{
                __(
                  "Set the base spacing multiplier value. This affects spacing calculations throughout your theme.",
                  "windpress",
                )
              }}
            </p>

            <UFormField
              :label="__('Spacing Value', 'windpress')"
              :help="__('Common values: 0.25rem, 1px, 4px, 8px', 'windpress')"
            >
              <UInput
                v-model="formData.spacing"
                :placeholder="__('e.g. 0.25rem', 'windpress')"
                size="sm"
              />
            </UFormField>

            <div class="bg-muted/50 border border-default rounded-lg p-3">
              <div class="flex items-start gap-2">
                <UIcon name="lucide:lightbulb" class="size-4 text-info mt-0.5 flex-shrink-0" />
                <div class="text-xs text-muted">
                  <p class="font-medium mb-1">{{ __("Examples:", "windpress") }}</p>
                  <div class="space-y-1">
                    <p>
                      <code class="text-xs bg-elevated px-1 py-0.5 rounded">0.25rem</code> -
                      {{ __("Default Tailwind spacing (4px per unit)", "windpress") }}
                    </p>
                    <p>
                      <code class="text-xs bg-elevated px-1 py-0.5 rounded">1px</code> -
                      {{ __("Pixel-perfect spacing", "windpress") }}
                    </p>
                    <p>
                      <code class="text-xs bg-elevated px-1 py-0.5 rounded">0.5rem</code> -
                      {{ __("8px per unit spacing", "windpress") }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Theme Preview -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="lucide:eye" class="size-5 text-neutral" />
              <h3 class="text-sm font-medium">{{ __("Current Configuration", "windpress") }}</h3>
            </div>
          </template>

          <div class="space-y-3">
            <div class="bg-elevated border border-default rounded-lg p-4 font-mono text-xs">
              <div class="text-dimmed mb-2">{{ __("Generated CSS:", "windpress") }}</div>
              <div class="space-y-1">
                <div>{{ formData.isStatic ? "@theme static {" : "@theme {" }}</div>
                <div v-if="formData.isInitial" class="pl-4 text-error">--*: initial;</div>
                <div v-if="formData.spacing" class="pl-4 text-primary">
                  --spacing: {{ formData.spacing }};
                </div>
                <div v-if="!formData.isInitial && !formData.spacing" class="pl-4 text-dimmed">
                  {{ __("/* Your theme variables will appear here */", "windpress") }}
                </div>
                <div>}</div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </UDashboardPanel>
</template>
