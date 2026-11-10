<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed, defineAsyncComponent, type Component } from "vue";

const integrationComponents: Record<string, Component> = {
  gutenberg: defineAsyncComponent(() => import("./Gutenberg.vue")),
  bricks: defineAsyncComponent(() => import("./Bricks.vue")),
  blockstudio: defineAsyncComponent(() => import("./Blockstudio.vue")),
  breakdance: defineAsyncComponent(() => import("./Breakdance.vue")),
  builderius: defineAsyncComponent(() => import("./Builderius.vue")),
  etch: defineAsyncComponent(() => import("./Etch.vue")),
  livecanvas: defineAsyncComponent(() => import("./LiveCanvas.vue")),
  oxygen: defineAsyncComponent(() => import("./Oxygen.vue")),
  "oxygen-classic": defineAsyncComponent(() => import("./OxygenClassic.vue")),
  wpcodebox2: defineAsyncComponent(() => import("./WPCodeBox2.vue")),
  elementor: defineAsyncComponent(() => import("./Elementor.vue")),
  greenshift: defineAsyncComponent(() => import("./GreenShift.vue")),
  kadence: defineAsyncComponent(() => import("./Kadence.vue")),
  timber: defineAsyncComponent(() => import("./Timber.vue")),
  "metabox-views": defineAsyncComponent(() => import("./MetaBoxViews.vue")),
  generic: defineAsyncComponent(() => import("./Generic.vue")),
};

const route = useRoute();
const IntegrationComponent = computed(
  () => integrationComponents[String(route.params.integration)] ?? integrationComponents.generic,
);
</script>

<template>
  <component :is="IntegrationComponent" />
</template>
