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
          <h2 class="text-xl font-semibold">{{ i18n.__("Gutenberg Settings", "windpress") }}</h2>
          <UBadge variant="soft" color="primary">@gutenberg</UBadge>
        </div>
      </div>
      <UTooltip :text="i18n.__('Help', 'windpress')">
        <UButton
          icon="i-lucide-circle-help"
          color="neutral"
          variant="soft"
          to="https://windpress.jooo.si/docs/guide/integrations/gutenberg"
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
                to="https://windpress.jooo.si/docs/guide/integrations/gutenberg"
                target="_blank"
              />
            </UTooltip>
          </div>
          <USwitch
            v-model="
              settingsStore.virtualOptions(`integration.gutenberg.compile.enabled`, true).value
            "
          />
        </div>
      </template>

      <div class="space-y-3">
        <p class="text-sm text-muted">
          {{
            i18n.__(
              "Enable CSS compilation for Gutenberg blocks and editor content. This processes Tailwind classes found in block content and generates the necessary CSS.",
              "windpress",
            )
          }}
        </p>
      </div>
    </UCard>

    <!-- Editor Integration -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-edit-3" class="size-5 text-primary" />
            <h3 class="text-sm font-medium">{{ i18n.__("Editor Integration", "windpress") }}</h3>
            <UTooltip :text="i18n.__('Help', 'windpress')">
              <UButton
                icon="i-lucide-circle-help"
                color="neutral"
                size="sm"
                variant="soft"
                to="https://windpress.jooo.si/docs/guide/integrations/gutenberg"
                target="_blank"
              />
            </UTooltip>
          </div>
          <USwitch
            v-model="
              settingsStore.virtualOptions(`integration.gutenberg.editor.enabled`, true).value
            "
          />
        </div>
      </template>

      <div class="space-y-3">
        <p class="text-sm text-muted">
          {{
            i18n.__(
              "Enable enhanced Gutenberg editor features including real-time Tailwind CSS preview, autocomplete, and editor enhancements.",
              "windpress",
            )
          }}
        </p>

        <!-- Theme.json Generation Sub-option -->
        <div class="pt-3 border-t border-default">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-json" class="size-4 text-muted" />
              <div class="flex-1">
                <h4 class="text-sm font-medium">
                  {{ i18n.__("Theme.json Generation", "windpress") }}
                </h4>
                <p class="text-xs text-muted mt-0.5">
                  {{
                    i18n.__(
                      "Generate theme.json with Tailwind colors, spacing, and typography",
                      "windpress",
                    )
                  }}
                </p>
              </div>
            </div>
            <USwitch
              v-model="
                settingsStore.virtualOptions(`integration.gutenberg.settings.theme_json`, false)
                  .value
              "
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Common Block -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-box" class="size-5 text-primary" />
            <h3 class="text-sm font-medium">{{ i18n.__("Common Block", "windpress") }}</h3>
            <UTooltip :text="i18n.__('Help', 'windpress')">
              <UButton
                icon="i-lucide-circle-help"
                color="neutral"
                size="sm"
                variant="soft"
                to="https://windpress.jooo.si/docs/guide/integrations/gutenberg"
                target="_blank"
              />
            </UTooltip>
          </div>
          <USwitch
            v-model="
              settingsStore.virtualOptions(`integration.gutenberg.settings.common_block`, true)
                .value
            "
          />
        </div>
      </template>

      <div class="space-y-3">
        <p class="text-sm text-muted">
          {{
            i18n.__(
              "Enable the Common Block - a generic block that can be any HTML element. Import HTML directly into the editor and convert between HTML and blocks seamlessly.",
              "windpress",
            )
          }}
        </p>
        <div class="bg-muted/50 border border-default rounded-lg p-3">
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-info" class="size-4 text-info mt-0.5 shrink-0" />
            <div class="text-xs text-muted">
              <p class="font-medium mb-1">{{ i18n.__("Features:", "windpress") }}</p>
              <ul class="space-y-1 text-xs">
                <li>
                  -
                  {{
                    i18n.__(
                      "Any HTML element can be a block (div, section, article, header, etc.)",
                      "windpress",
                    )
                  }}
                </li>
                <li>- {{ i18n.__("Import HTML code directly into the editor", "windpress") }}</li>
                <li>- {{ i18n.__("Export blocks as clean HTML", "windpress") }}</li>
                <li>
                  - {{ i18n.__("Full control over attributes, classes, and content", "windpress") }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
