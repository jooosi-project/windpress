<script setup>
import { useStorage } from "@vueuse/core";
import { ref } from "vue";

const props = defineProps({
  namespace: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

const sectionRef = ref(null);

const expand = useStorage(
  `windpressbuilderius-variable-app.ui.expansion-panels.${props.namespace}`,
  { [`${props.name}`]: false },
  undefined,
  { mergeDefaults: true },
);

function togglePanel(val) {
  expand.value[props.name] = val === null ? !expand.value[props.name] : val;
}

function scrollIntoView() {
  sectionRef.value.scrollIntoView();
}

defineExpose({
  togglePanel,
  scrollIntoView,
});
</script>

<template>
  <div ref="sectionRef" class="expansion-panel mx:10 py:8">
    <div
      class="expansion-panel__header flex justify-content:space-between p:10 r:8 cursor:pointer"
      @click="expand[name] = !expand[name]"
    >
      <div class="header-slot flex-grow:1">
        <slot name="header" />
      </div>
      <div>
        <i-fa6-solid-chevron-right
          :style="{ transform: expand[name] ? 'rotate(-90deg)' : 'rotate(0deg)' }"
          class="iconify ~duration:300 font:18"
        />
      </div>
    </div>
    <Transition>
      <div v-if="expand[name]" class="expansion-panel__body">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.expansion-panel {
  margin-left: 10px;
  margin-right: 10px;
  padding-top: 8px;
  padding-bottom: 8px;

  .expansion-panel__header {
    line-height: 1.7;
    display: flex;
    justify-content: space-between;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;

    .header-slot {
      flex-grow: 1;
    }

    .iconify {
      font-size: 18px;
      transition: transform 300ms;
    }
  }
}

/* we will explain what these classes do next! */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
