<script setup>
import { ref, watch, onMounted, inject } from "vue";
import Logo from "~/windpress.svg";
import { uni } from "@/integration/builderius/constant.js";

const variableApp = inject("variableApp");
const isOpen = inject("isOpen");

function allowDragPanel() {
  const draggable = variableApp.querySelector("#windpressbuilderius-variable-app-header");
  let isDragging = ref(false);
  let offsetX = 0;
  let offsetY = 0;

  watch(isDragging, (value) => {
    if (!value) {
      document.body.style.removeProperty("user-select");
      uni.style.removeProperty("pointer-events");

      draggable.style.cursor = "grab";
    } else {
      document.body.style.userSelect = "none";
      uni.style.pointerEvents = "none";
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
    id="windpressbuilderius-variable-app-header"
    class="header-container bg:$(primary-1) cursor:grab bb:1|solid|$(primary-3)"
  >
    <div class="header-content flex gap:10 align-items:center fg:$(base-2)">
      <div class="header-logo flex px:12 py:2 align-items:center">
        <inline-svg :src="Logo" class="inline-svg fill:current font:24" />
      </div>
      <div
        v-tooltip="{ placement: 'top', content: `v${windpressbuilderius._version}` }"
        class="header-title text-transform:none font:medium text:center flex-grow:1 gap:10 align-items:center cursor:default px:12 py:2"
      >
        WindPress
      </div>
      <button
        v-tooltip="{ placement: 'top', content: 'Close' }"
        class="uniPanelIconButton header-exit r:0 bg:$(primary-3):hover py:10 px:12"
        @click="isOpen = !isOpen"
      >
        <i-fa6-solid-xmark class="iconify fg:$(base-2) font:16" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.header-container {
  background-color: var(--primary-1);
  cursor: grab;
  border-bottom: 1px solid var(--primary-3);

  .header-content {
    display: flex;
    gap: 10px;
    align-items: center;
    color: var(--base-2);

    .header-logo {
      display: flex;
      padding: 2px 12px;
      align-items: center;

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
      border-radius: 0;
      padding: 10px 12px;

      &:hover {
        background-color: var(--primary-3);
      }

      .iconify {
        font-size: 16px;
        color: var(--base-2);
      }
    }
  }
}
</style>
