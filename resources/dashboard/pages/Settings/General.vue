<script setup lang="ts">
import { onBeforeMount, reactive, ref, watch } from "vue";
import { useLicenseStore } from "@/dashboard/stores/license";
import { useBusyStore } from "@/dashboard/stores/busy";
import { version as tw4_version } from "tailwindcss/package.json";
import { version as tw3_version } from "tailwindcss3/package.json";
import { useSettingsStore } from "@/dashboard/stores/settings";
import { __ } from "@wordpress/i18n";

const appConfig = useAppConfig();

const toast = useToast();

const licenseStore = useLicenseStore();
const settingsStore = useSettingsStore();
const busyStore = useBusyStore();

const licenseKeyError = ref<string | boolean>(false);

const license = reactive({
  key: "",
});

watch(
  () => license.key,
  () => {
    licenseKeyError.value = false;
  },
);

function doLicenseChange() {
  licenseKeyError.value = false;

  toast.add({
    id: "license.change",
    title:
      licenseStore.license.key && licenseStore.isActivated
        ? __("Deactivating license...", "windprees")
        : __("Activating license...", "windpress"),
    description:
      licenseStore.license.key && licenseStore.isActivated
        ? __("Please wait while we deactivate your license key.", "windpress")
        : __("Please wait while we activate your license key.", "windpress"),
    icon: "lucide:loader-circle",
    close: false,
    duration: 0,
    color: "neutral",
    ui: {
      icon: "animate-spin",
    },
  });

  const promise =
    licenseStore.license.key && licenseStore.isActivated
      ? licenseStore.doDeactivate()
      : licenseStore.doActivate(license.key);

  promise
    .then(() => {
      license.key = licenseStore.license.key;

      toast.update("license.change", {
        title: __("License updated", "windpress"),
        description: licenseStore.isActivated
          ? __("Your license key has been activated.", "windpress")
          : __("Your license key has been deactivated.", "windpress"),
        icon: "lucide:key-round",
        color: "success",
        duration: undefined,
        close: true,
        ui: {
          icon: undefined,
        },
      });
    })
    .catch((error) => {
      toast.update("license.change", {
        title: __("License update failed", "windpress"),
        description:
          error instanceof Error ? error.message : __("An unknown error occurred", "windpress"),
        icon: "lucide:key-round",
        color: "error",
        close: true,
        duration: undefined,
        ui: {
          icon: undefined,
        },
      });

      licenseKeyError.value = __("Invalid license key", "windpress");
    });
}

onBeforeMount(() => {
  licenseStore.doPull().then(() => {
    license.key = licenseStore.license.key;
  });
});
</script>

<template>
  <UPageCard
    v-if="window.windpress._via_wp_org"
    :title="i18n.__('License', 'windpress')"
    class="bg-gradient-to-tl from-(--ui-primary)/10 from-5% to-(--ui-bg)"
  >
    <template #description>
      {{ i18n.__("You are using the WordPress.org edition.", "windpress") }}
    </template>

    <template #footer>
      <UButton
        :label="i18n.__('Upgrade to Pro', 'windpress')"
        color="primary"
        :trailing-icon="appConfig.ui.icons.external"
        :ui="{ trailingIcon: 'inline-block size-3 align-top', base: 'gap-[normal] items-start' }"
        :to="`https://windpress.jooo.si/?utm_source=wordpress-plugins&utm_medium=plugin-menu&utm_campaign=windpress&utm_id=all-edition&windpress_version=${window.windpress._version}#pricing`"
        target="_blank"
      />
    </template>
  </UPageCard>

  <UPageCard
    v-else
    title="License"
    description=""
    :class="licenseStore.isActivated ? 'from-(--ui-primary)/10' : 'from-(--ui-warning)/10'"
    class="bg-gradient-to-tl from-5% to-(--ui-bg)"
  >
    <UForm :state="license" @submit="doLicenseChange">
      <UFormField
        :label="i18n.__('License key', 'windpress')"
        required
        :error="licenseKeyError"
        :help="
          i18n.__(
            'To access updates when they are available, please provide your license key.',
            'windpress',
          )
        "
      >
        <div class="flex flex-row gap-4 my-2">
          <UInput
            v-model="license.key"
            type="password"
            placeholder="WIND-12345-67890-PRESS"
            class="w-full"
            data-1p-ignore
          />

          <UTooltip
            :delay-duration="0"
            :text="
              licenseStore.isActivated
                ? i18n.__('Unregister your WindPress setup', 'windpress')
                : i18n.__('Register your WindPress setup', 'windpress')
            "
          >
            <UButton
              type="submit"
              color="primary"
              variant="subtle"
              :leading-icon="
                busyStore.isBusy &&
                busyStore.tasks.some(
                  (t) =>
                    t.task === 'settings.license.activate' ||
                    t.task === 'settings.license.deactivate',
                )
                  ? 'lucide:loader-circle'
                  : undefined
              "
              :disabled="!license.key || busyStore.isBusy"
              :ui="{ leadingIcon: 'animate-spin' }"
            >
              <template v-if="licenseStore.isActivated">
                {{
                  busyStore.isBusy &&
                  busyStore.tasks.some((t) => t.task === "settings.license.deactivate")
                    ? i18n.__("Deactivating", "windpress")
                    : i18n.__("Deactivate", "windpress")
                }}
              </template>
              <template v-else>
                {{
                  busyStore.isBusy &&
                  busyStore.tasks.some((t) => t.task === "settings.license.activate")
                    ? i18n.__("Activating", "windpress")
                    : i18n.__("Activate", "windpress")
                }}
              </template>
            </UButton>
          </UTooltip>
        </div>
        <template v-if="licenseStore.license.key" #hint>
          <div class="flex items-center gap-2">
            <span class="text-(--ui-text-muted)"> {{ i18n.__("Status", "windpress") }} :</span>
            <UBadge :color="licenseStore.isActivated ? 'success' : 'error'" variant="subtle">
              {{
                licenseStore.isActivated
                  ? i18n.__("Active", "windpress")
                  : i18n.__("Inactive", "windpress")
              }}
            </UBadge>
          </div>
        </template>
      </UFormField>
    </UForm>
  </UPageCard>

  <UForm id="general" :state="{}">
    <UPageCard
      :title="i18n.__('General', 'windpress')"
      :description="i18n.__('General settings for WindPress.', 'windpress')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        :label="i18n.__('Tailwind CSS version', 'windpress')"
        :description="i18n.__('You must update the `main.css` file accordingly.', 'windpress')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'flex-1' }"
      >
        <template #hint>
          <ULink
            to="https://github.com/tailwindlabs/tailwindcss/releases"
            target="_blank"
            class="underline"
          >
            {{ i18n.__("See release notes", "windpress") }}
          </ULink>
        </template>
        <div class="grid grid-cols-2 gap-3">
          <label
            class="flex items-center justify-center rounded-md p-3 font-semibold flex-1 bg-(--ui-bg-accented) hover:ring-(--ui-text)/50 hover:ring-1 has-checked:bg-[#0073e0] has-checked:text-white"
          >
            <input
              v-model="settingsStore.virtualOptions('general.tailwindcss.version', 4).value"
              type="radio"
              name="tailwindcss_version"
              :value="3"
              class="sr-only"
            />
            <span>{{ tw3_version }}</span>
          </label>
          <label
            class="flex items-center justify-center rounded-md p-3 font-semibold flex-1 bg-(--ui-bg-accented) hover:ring-(--ui-text)/50 hover:ring-1 has-checked:bg-[#0073e0] has-checked:text-white"
          >
            <input
              v-model="settingsStore.virtualOptions('general.tailwindcss.version', 4).value"
              type="radio"
              name="tailwindcss_version"
              :value="4"
              class="sr-only"
            />
            <span>{{ tw4_version }}</span>
          </label>
        </div>
      </UFormField>
      <!-- <USeparator />
      <UFormField :label="i18n.__('Ubiquitous panel', 'windpress')" :description="i18n.__('Access the WindPress dashboard panel right from the front page and made adjustment as it is on the wp-admin page.', 'windpress')" class="flex items-center justify-between not-last:pb-4 gap-4">
        <USwitch v-model="settingsStore.virtualOptions('general.ubiquitous-panel.enabled', false).value" disabled />
      </UFormField> -->
    </UPageCard>
  </UForm>
</template>
