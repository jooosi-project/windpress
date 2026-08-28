<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed, defineAsyncComponent } from "vue";

const route = useRoute();

// Get integration ID from route params
const integrationId = computed(() => route.params.integration as string);

// Component to render based on integration
const IntegrationComponent = computed(() => {
  switch (integrationId.value) {
    case "gutenberg":
      return defineAsyncComponent(() => import("./Gutenberg.vue"));
    case "bricks":
      return defineAsyncComponent(() => import("./Bricks.vue"));
    case "blockstudio":
      return defineAsyncComponent(() => import("./Blockstudio.vue"));
    case "breakdance":
      return defineAsyncComponent(() => import("./Breakdance.vue"));
    case "builderius":
      return defineAsyncComponent(() => import("./Builderius.vue"));
    case "etch":
      return defineAsyncComponent(() => import("./Etch.vue"));
    case "livecanvas":
      return defineAsyncComponent(() => import("./LiveCanvas.vue"));
    case "oxygen":
      return defineAsyncComponent(() => import("./Oxygen.vue"));
    case "oxygen-classic":
      return defineAsyncComponent(() => import("./OxygenClassic.vue"));
    case "wpcodebox2":
      return defineAsyncComponent(() => import("./WPCodeBox2.vue"));
    case "elementor":
      return defineAsyncComponent(() => import("./Elementor.vue"));
    case "greenshift":
      return defineAsyncComponent(() => import("./GreenShift.vue"));
    case "kadence":
      return defineAsyncComponent(() => import("./Kadence.vue"));
    case "timber":
      return defineAsyncComponent(() => import("./Timber.vue"));
    case "metabox-views":
      return defineAsyncComponent(() => import("./MetaBoxViews.vue"));
    case "divi":
    default:
      return defineAsyncComponent(() => import("./Generic.vue"));
  }
});
</script>

<template>
  <component :is="IntegrationComponent" />
</template>
