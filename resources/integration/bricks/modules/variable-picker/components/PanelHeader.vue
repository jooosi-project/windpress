<script setup>
import { ref, watch, onMounted, inject } from "vue";
import Logo from "~/windpress.svg";
import { brx } from "@/integration/bricks/constant.js";

const variableApp = inject("variableApp");
const isOpen = inject("isOpen");

function allowDragPanel() {
  const draggable = variableApp.querySelector("#windpressbricks-variable-app-header");
  let isDragging = ref(false);
  let offsetX = 0;
  let offsetY = 0;

  watch(isDragging, (value) => {
    if (!value) {
      document.body.style.removeProperty("user-select");
      brx.style.removeProperty("pointer-events");

      draggable.style.cursor = "grab";
    } else {
      document.body.style.userSelect = "none";
      brx.style.pointerEvents = "none";
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
  <div id="windpressbricks-variable-app-header" class="header-container">
    <div class="header-content">
      <div class="header-logo">
        <inline-svg :src="Logo" class="inline-svg" />
      </div>
      <div
        v-tooltip="{ placement: 'top', content: `v${windpressbricks._version}` }"
        class="header-title"
      >
        WindPress
      </div>
      <button
        v-tooltip="{ placement: 'top', content: 'Close' }"
        class="header-exit"
        @click="isOpen = !isOpen"
      >
        <i-fa6-solid-xmark class="iconify" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.header-container {
  background-color: var(--builder-bg);
  cursor: grab;
  border-bottom: 1px solid var(--builder-border-color);

  .header-content {
    padding: 2px 0;
    display: flex;
    gap: 10px;
    align-items: center;

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
      font-weight: bold;
      gap: 10px;
      text-align: center;
      flex-grow: 1;
      align-items: center;
      cursor: default;
      padding: 2px 12px;
    }

    .header-exit {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background-color: transparent;

      &:hover {
        background-color: var(--builder-bg-accent);
      }

      .iconify {
        color: var(--builder-color);
      }
    }
  }
}
</style>
