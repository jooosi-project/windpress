<script setup lang="ts">
import { __, sprintf } from '@wordpress/i18n';

import JooosiIcon from '@/dashboard/assets/icon/jooosi.svg';
import LiveCanvasIcon from '@/dashboard/assets/icon/livecanvas.svg';
import WindPressIcon from '@/dashboard/assets/icon/windpress.svg';

interface Capability {
  title: string;
  description: string;
  icon: string;
}

interface Sponsor {
  name: string;
  description: string;
  href: string;
  iconSrc: string;
}

const capabilities: Capability[] = [
  {
    title: __('Tailwind CSS 3 and 4', 'windpress'),
    description: __('Choose the Tailwind generation that fits each WordPress project.', 'windpress'),
    icon: 'lucide:layers-3',
  },
  {
    title: __('Browser-native compiler', 'windpress'),
    description: __('Generate optimized CSS in the browser without server-side build tools.', 'windpress'),
    icon: 'lucide:cpu',
  },
  {
    title: __('Builder integrations', 'windpress'),
    description: __('Bring Tailwind utilities to the block editor, page builders, themes, and plugins.', 'windpress'),
    icon: 'lucide:plug-zap',
  },
  {
    title: __('Visual design tools', 'windpress'),
    description: __('Compose themes, edit source files, and preview utilities from WordPress.', 'windpress'),
    icon: 'lucide:wand-sparkles',
  },
];

const sponsorshipBenefits: Capability[] = [
  {
    title: __('Release visibility', 'windpress'),
    description: __('Your brand can appear with supported plugin releases.', 'windpress'),
    icon: 'lucide:package',
  },
  {
    title: __('Project documentation', 'windpress'),
    description: __('Sponsors are recognized across project documentation.', 'windpress'),
    icon: 'lucide:file-code-2',
  },
  {
    title: __('Admin recognition', 'windpress'),
    description: __('Featured support helps sustain ongoing development.', 'windpress'),
    icon: 'lucide:badge-check',
  },
  {
    title: __('Developer reach', 'windpress'),
    description: __('Connect with the wider WordPress developer community.', 'windpress'),
    icon: 'lucide:users',
  },
];

const sponsors: Sponsor[] = [
  {
    name: 'Jooosi',
    description: __('Open-source tools and products for WordPress.', 'windpress'),
    href: 'https://jooo.si',
    iconSrc: JooosiIcon,
  },
  {
    name: 'LiveCanvas',
    description: __('A visual site builder for WordPress.', 'windpress'),
    href: 'https://livecanvas.com',
    iconSrc: LiveCanvasIcon,
  },
];
</script>

<template>
  <UDashboardPanel id="about" :ui="{ body: 'lg:py-8' }">
    <template #header>
      <UDashboardNavbar :title="__('About', 'windpress')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <UCard :ui="{ body: 'p-0 sm:p-0', footer: 'p-4 sm:px-6' }">
          <template #header>
            <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 items-center gap-4">
                <span
                  class="grid size-14 shrink-0 place-items-center rounded-xl border border-default bg-default shadow-xs"
                >
                  <img :src="WindPressIcon" alt="" class="size-9" />
                </span>
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h1 class="text-xl font-semibold text-highlighted">WindPress</h1>
                    <UBadge color="primary" variant="subtle">
                      {{ sprintf(__('Version %s', 'windpress'), window.windpress._version) }}
                    </UBadge>
                  </div>
                  <p class="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
                    {{
                      __(
                        'A build-free Tailwind CSS integration for creating fast, utility-first WordPress sites with the tools you already use.',
                        'windpress',
                      )
                    }}
                  </p>
                </div>
              </div>

              <UButton
                :label="__('Visit website', 'windpress')"
                icon="lucide:external-link"
                color="neutral"
                variant="outline"
                to="https://windpress.jooo.si"
                target="_blank"
                class="shrink-0"
              />
            </div>
          </template>

          <div class="grid sm:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="(capability, index) in capabilities"
              :key="capability.title"
              class="flex min-w-0 flex-col gap-3 border-default p-5"
              :class="[
                index < capabilities.length - 1 && 'border-b xl:border-r xl:border-b-0',
                index === 0 && 'sm:border-r',
                index === 1 && 'sm:border-r-0',
                index === 2 && 'sm:border-b-0 sm:border-r',
              ]"
            >
              <span
                class="grid size-9 place-items-center rounded-lg border border-default bg-elevated"
                aria-hidden="true"
              >
                <UIcon :name="capability.icon" class="size-4" />
              </span>
              <div>
                <h2 class="text-sm font-semibold text-highlighted">{{ capability.title }}</h2>
                <p class="mt-1 text-sm leading-5 text-muted">{{ capability.description }}</p>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-2 text-sm text-muted">
                <UBadge color="success" variant="subtle">GPL-3.0-or-later</UBadge>
                <span>{{ __('Open source', 'windpress') }}</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <UButton
                  :label="__('GitHub repository', 'windpress')"
                  icon="fa6-brands:github"
                  color="neutral"
                  variant="outline"
                  to="https://github.com/jooosi-project/windpress"
                  target="_blank"
                />
                <UButton
                  :label="__('Community', 'windpress')"
                  icon="lucide:users"
                  color="neutral"
                  variant="outline"
                  to="https://windpress.jooo.si/go/facebook"
                  target="_blank"
                />
              </div>
            </div>
          </template>
        </UCard>

        <div class="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <UCard :ui="{ body: 'p-0 sm:p-0', footer: 'p-4 sm:px-6' }">
            <template #header>
              <h2 class="text-base font-semibold text-highlighted">
                {{ __('Open-source sponsorship', 'windpress') }}
              </h2>
              <p class="mt-1 text-sm text-muted">
                {{
                  __(
                    'Every contribution supports maintenance across the complete WordPress plugin portfolio.',
                    'windpress',
                  )
                }}
              </p>
            </template>

            <div class="grid sm:grid-cols-2">
              <div
                v-for="(benefit, index) in sponsorshipBenefits"
                :key="benefit.title"
                class="flex min-w-0 items-start gap-3 border-default p-4"
                :class="[
                  index % 2 === 0 && 'sm:border-r',
                  index < 2 && 'border-b',
                  index === 2 && 'max-sm:border-b',
                ]"
              >
                <span
                  class="grid size-9 shrink-0 place-items-center rounded-lg border border-default bg-elevated"
                  aria-hidden="true"
                >
                  <UIcon :name="benefit.icon" class="size-4" />
                </span>
                <div class="min-w-0">
                  <h3 class="text-sm font-medium text-highlighted">{{ benefit.title }}</h3>
                  <p class="mt-1 text-xs leading-5 text-muted">{{ benefit.description }}</p>
                </div>
              </div>
            </div>

            <template #footer>
              <div class="flex flex-col gap-2 sm:flex-row">
                <UButton
                  :label="__('GitHub Sponsors', 'windpress')"
                  icon="fa6-brands:github"
                  to="https://github.com/sponsors/suasgn"
                  target="_blank"
                  class="flex-1 justify-center"
                />
                <UButton
                  label="Ko-fi"
                  icon="lucide:coffee"
                  color="neutral"
                  variant="outline"
                  to="https://ko-fi.com/Q5Q75XSF7"
                  target="_blank"
                  class="flex-1 justify-center"
                />
              </div>
            </template>
          </UCard>

          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <template #header>
              <div class="flex items-center gap-3">
                <span
                  class="grid size-9 shrink-0 place-items-center rounded-lg border border-default bg-elevated"
                  aria-hidden="true"
                >
                  <UIcon name="lucide:zap" class="size-4" />
                </span>
                <div class="min-w-0">
                  <h2 class="text-base font-semibold text-highlighted">
                    {{ __('Proudly sponsored by', 'windpress') }}
                  </h2>
                  <p class="mt-1 text-sm text-muted">
                    {{ __('Partners helping keep WindPress sustainable.', 'windpress') }}
                  </p>
                </div>
              </div>
            </template>

            <UButton
              v-for="(sponsor, index) in sponsors"
              :key="sponsor.name"
              :to="sponsor.href"
              target="_blank"
              color="neutral"
              variant="ghost"
              class="group h-auto w-full justify-start gap-4 rounded-none p-4 text-left"
              :class="index < sponsors.length - 1 && 'border-b border-default'"
              :ui="{ base: 'items-center' }"
            >
              <span
                class="grid size-12 shrink-0 place-items-center rounded-xl border border-default bg-elevated"
                aria-hidden="true"
              >
                <img :src="sponsor.iconSrc" alt="" class="size-7 object-contain" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-highlighted">{{ sponsor.name }}</span>
                <span class="mt-0.5 block whitespace-normal text-xs leading-5 text-muted">
                  {{ sponsor.description }}
                </span>
              </span>
              <UIcon
                name="lucide:external-link"
                class="size-4 shrink-0 text-dimmed transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </UButton>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
