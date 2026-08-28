<script setup lang="ts">
import { onBeforeMount, ref } from "vue";
import { useSettingsStore } from "@/dashboard/stores/settings";
import { useApi } from "@/dashboard/library/api";

const settingsStore = useSettingsStore();
const api = useApi();

interface Provider {
  id: string;
  name: string;
  description: string;
  type?: "plugin" | "theme" | "custom";
  homepage?: string;
  is_installed_active?: number; // -1: not installed, 0: installed, 1: activated
}

const providers = ref<Provider[]>([]);

async function pullProviders() {
  await api.get("admin/settings/cache/providers").then((resp) => {
    providers.value = resp.data.providers.sort((a: Provider, b: Provider) =>
      a.id.localeCompare(b.id),
    );
  });
}

onBeforeMount(() => {
  pullProviders();
});
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <component :is="Component" v-if="Component && route.name !== 'settings.integrations'" />
    <template v-else>
      <UForm id="integrations" :state="{}">
        <UPageCard
          :title="i18n.__('Integrations', 'windpress')"
          :description="i18n.__('Enable or disable integrations with other services.', 'windpress')"
          variant="naked"
          class="mb-4"
        >
        </UPageCard>
        <UPageCard variant="subtle" :ui="{ container: 'divide-y divide-(--ui-border)' }">
          <UFormField
            v-for="provider in providers"
            :key="provider.id"
            :name="provider.id"
            class="flex items-center justify-between not-last:pb-4 gap-4"
          >
            <template #label>
              <div class="flex items-center gap-2">
                <span>{{ provider.name }}</span>
              </div>
            </template>
            <template #description>
              <div class="flex flex-col gap-1">
                <span>{{ provider.description }}</span>
                <div class="flex items-center gap-2">
                  <UBadge v-if="provider.type" :label="provider.type" size="sm" variant="outline" />
                  <UBadge
                    v-if="provider.is_installed_active !== undefined"
                    :label="
                      provider.is_installed_active === 1
                        ? i18n.__('Activated', 'windpress')
                        : provider.is_installed_active === 0
                          ? i18n.__('Installed', 'windpress')
                          : i18n.__('Not Installed', 'windpress')
                    "
                    :color="
                      provider.is_installed_active === 1
                        ? 'success'
                        : provider.is_installed_active === 0
                          ? 'info'
                          : 'neutral'
                    "
                    size="sm"
                    variant="subtle"
                  />
                  <div v-if="provider.homepage" class="flex items-center gap-1">
                    <UIcon name="i-lucide-external-link" class="size-3" />
                    <ULink :to="provider.homepage" target="_blank" class="text-xs">
                      {{ i18n.__("Visit homepage", "windpress") }}
                    </ULink>
                  </div>

                  <UTooltip :text="i18n.__('Integration Settings', 'windpress')">
                    <UButton
                      icon="i-lucide-settings"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :to="{
                        name: 'settings.integrations.detail',
                        params: { integration: provider.id },
                      }"
                    />
                  </UTooltip>
                </div>
              </div>
            </template>
            <div class="flex items-center gap-2">
              <!-- <UTooltip :text="i18n.__('Integration Settings', 'windpress')">
                <UButton icon="i-lucide-settings" color="neutral" variant="ghost" size="xs" :to="{ name: 'settings.integrations.detail', params: { integration: provider.id } }" />
              </UTooltip> -->
              <USwitch
                v-model="
                  settingsStore.virtualOptions(`integration.${provider.id}.enabled`, true)
                    .value as boolean
                "
                :label="`[${provider.id}]`"
                :ui="{ label: 'whitespace-nowrap text-(--ui-text-muted) font-normal' }"
                class="flex-row-reverse gap-2"
              />
            </div>
          </UFormField>
        </UPageCard>
      </UForm>
    </template>
  </router-view>
</template>
