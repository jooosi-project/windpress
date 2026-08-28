<script setup>
import { inject } from "vue";
import PanelHeader from "./components/PanelHeader.vue";
import PanelBody from "./components/PanelBody.vue";

const isOpen = inject("isOpen");
</script>

<template>
  <div v-show="isOpen" id="windpressbricks-variable-app-container" class="wp-b-var-container">
    <PanelHeader />
    <Suspense>
      <PanelBody />
    </Suspense>
  </div>
</template>

<style lang="scss" scoped>
.wp-b-var-container {
  // font-size: 16px;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color: var(--builder-color);
  background-color: var(--builder-bg);
}
</style>
