<script setup>
import { ref, watch, onMounted, inject } from "vue";
import Logo from "~/windpress.svg";
import { bde } from "@/integration/breakdance/constant.js";

const variableApp = inject("variableApp");
const isOpen = inject("isOpen");

function allowDragPanel() {
  const draggable = variableApp.querySelector("#windpressbreakdance-variable-app-header");
  let isDragging = ref(false);
  let offsetX = 0;
  let offsetY = 0;

  watch(isDragging, (value) => {
    if (!value) {
      document.body.style.removeProperty("user-select");
      bde.querySelector("div.v-application--wrap").style.removeProperty("pointer-events");

      draggable.style.cursor = "grab";
    } else {
      document.body.style.userSelect = "none";
      bde.querySelector("div.v-application--wrap").style.pointerEvents = "none";
      draggable.style.cursor = "grabbing";
    }
  });

  const handleDragStart = (e) => {
    isDragging.value = true;
    const rect = draggable.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  };

  draggable.removeEventListener("mousedown", handleDragStart);
  draggable.addEventListener("mousedown", handleDragStart);

  const handleDrag = (e) => {
    if (!isDragging.value) {
      return;
    }
    const rect = draggable.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const x = clientX - offsetX;
    const y = clientY - offsetY;
    const posX =
      x < 0 ? 0 : x > window.innerWidth - rect.width ? window.innerWidth - rect.width : x;
    const posY =
      y < 0 ? 0 : y > window.innerHeight - rect.height ? window.innerHeight - rect.height : y;
    variableApp.style.left = `${posX}px`;
    variableApp.style.top = `${posY}px`;
  };
  document.removeEventListener("mousemove", handleDrag);
  document.addEventListener("mousemove", handleDrag);
  const endDragging = (e) => {
    isDragging.value = false;
  };
  document.removeEventListener("mouseup", endDragging);
  document.addEventListener("mouseup", endDragging);
}

onMounted(() => {
  allowDragPanel();
});
</script>

<template>
  <div
    id="windpressbreakdance-variable-app-header"
    class="header-container cursor:grab bb:1|solid|$(gray200)"
  >
    <div class="header-content flex gap:10 align-items:center fg:var(dark)">
      <div class="header-logo flex align-items:center px:12 py:2">
        <inline-svg :src="Logo" class="inline-svg fill:current font:24" />
      </div>
      <div
        v-tooltip="{ placement: 'top', content: `v${windpressbreakdance._version}` }"
        class="header-title text-transform:none font:medium text:center flex-grow:1 gap:10 align-items:center cursor:default px:12 py:2"
      >
        WindPress
      </div>
      <button
        v-tooltip="{ placement: 'top', content: 'Close' }"
        class="header-exit flex align-items:center py:10 px:12 fg:$(blue600):hover bg:$(blue50):hover"
        @click="isOpen = !isOpen"
      >
        <i-fa6-solid-xmark class="iconify font:16" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.header-container {
  cursor: grab;
  border-bottom: 1px solid var(--gray200);

  .header-content {
    display: flex;
    gap: 10px;
    align-items: center;
    color: var(--dark);

    .header-logo {
      display: flex;
      align-items: center;
      padding: 2px 12px;

      .inline-svg {
        fill: currentColor;
        font-size: 24px;
      }
    }

    .header-title {
      text-transform: none;
      font-weight: medium;
      text-align: center;
      flex-grow: 1;
      gap: 10px;
      align-items: center;
      cursor: default;
      padding: 2px 12px;
    }

    .header-exit {
      padding: 10px 12px;
      flex: 0 0 auto;
      align-items: center;

      &:hover {
        color: var(--blue600);
        background-color: var(--blue50);
      }

      .iconify {
        font-size: 16px;
      }
    }
  }
}
</style>
