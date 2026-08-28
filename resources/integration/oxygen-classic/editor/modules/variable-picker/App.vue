<script setup>
import { inject } from "vue";
import PanelHeader from "./components/PanelHeader.vue";
import PanelBody from "./components/PanelBody.vue";

const isOpen = inject("isOpen");
</script>

<template>
  <div v-show="isOpen" id="windpressoxygen-variable-app-container">
    <PanelHeader />
    <Suspense>
      <PanelBody />
    </Suspense>
  </div>
</template>

<style scoped>
#windpressoxygen-variable-app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}
</style>
