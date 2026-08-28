<script setup>
import { getActiveElement } from "@/integration/bricks/modules/variable-picker/utility.js";
import { inject } from "vue";
import { logger } from "@/integration/common/logger";

const HOVER_VARIABLE_PREVIEW_TIMEOUT = 1000;

const props = defineProps({
  variableItems: {
    type: Object,
    required: true,
  },
});

const focusedInput = inject("focusedInput");
const recentColorPickerTarget = inject("recentColorPickerTarget");
const recentVariableSelectionTimestamp = inject("recentVariableSelectionTimestamp");
const tempInputValue = inject("tempInputValue");

function onMouseEnter(e, color) {
  const timeElapsedBetweenSelections = performance.now() - recentVariableSelectionTimestamp.value;
  const isInCoolDown = timeElapsedBetweenSelections < HOVER_VARIABLE_PREVIEW_TIMEOUT;
  if (isInCoolDown) return;

  if (!focusedInput.value) {
    const activeElement = getActiveElement();
    if (!activeElement) return;

    const stylesArray = [
      { property: "color", control: "typography" },
      { property: "backgroundColor", control: "background" },
      { property: "borderColor", control: "border" },
    ];

    for (const { property, control } of stylesArray) {
      if (recentColorPickerTarget.value?.closest(`[data-control="${control}"]`)) {
        activeElement.style[property] = `var(${color})`;
      }
    }
    return;
  }

  focusedInput.value.value = `var(${color})`;
  focusedInput.value.dispatchEvent(new Event("input"));
  focusedInput.value.focus();
}

function onMouseLeave(e) {
  if (!focusedInput.value || tempInputValue.value === null) {
    const activeElement = getActiveElement();
    if (!activeElement) return;

    const stylesArray = [
      { property: "color", control: "typography" },
      { property: "backgroundColor", control: "background" },
      { property: "borderColor", control: "border" },
    ];

    for (const { property, control } of stylesArray) {
      if (recentColorPickerTarget.value?.closest(`[data-control="${control}"]`)) {
        activeElement.style[property] = "";
      }
    }
    return;
  }

  focusedInput.value.value = tempInputValue.value;
  focusedInput.value.dispatchEvent(new Event("input"));
  focusedInput.value.focus();
}

function onClick(e, color) {
  e.stopPropagation();
  e.preventDefault();
  if (!focusedInput.value) {
    const recentColorPickerTargetCopy = recentColorPickerTarget.value;
    selectColor(color);
    recentVariableSelectionTimestamp.value = performance.now();
    setTimeout(() => {
      const activeElement = getActiveElement();
      if (!activeElement) {
        return;
      }
      const stylesArray = [
        { property: "color", control: "typography" },
        { property: "backgroundColor", control: "background" },
        { property: "borderColor", control: "border" },
      ];

      for (const { property, control } of stylesArray) {
        if (recentColorPickerTargetCopy?.closest(`[data-control="${control}"]`)) {
          activeElement.style[property] = "";
        }
      }
    }, 5);
    return;
  }

  focusedInput.value.value = `var(${color})`;
  focusedInput.value.dispatchEvent(new Event("input"));
  focusedInput.value.focus();
  tempInputValue.value = `var(${color})`;
  recentVariableSelectionTimestamp.value = performance.now();
}

function showBricksColorPopUp() {
  document.querySelectorAll(".windpressbricks-variable-app-colorpopup").forEach((style) => {
    style.remove();
  });
}

function hideBricksColorPopUp() {
  if (document.querySelector(".windpressbricks-variable-app-colorpopup")) {
    return;
  }
  const css = `.bricks-control-popup { display: none !important; }`;
  const style = document.createElement("style");
  style.id = "windpressbricks-variable-app-bricks-popup";
  style.appendChild(document.createTextNode(css));
  style.classList.add("windpressbricks-variable-app-colorpopup");
  document.head.appendChild(style);
}

async function selectColor(color) {
  hideBricksColorPopUp();
  const isPopupAlreadyOpen = document.querySelector(".bricks-control-popup .color-palette.grid");
  if (!isPopupAlreadyOpen) {
    recentColorPickerTarget.value?.closest(".bricks-control-preview")?.click();
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const colorsGrid = document.querySelector(".bricks-control-popup .color-palette.grid");
  if (colorsGrid) {
    const targetColor = colorsGrid.querySelector(`[data-balloon="var(${color})"]`);
    targetColor?.parentElement?.click();
  } else {
    logger("Failed to select color. Color grid not found.", {
      module: "variable-picker",
      type: "error",
    });
  }
  document.querySelector("body")?.click();
  await new Promise((resolve) => setTimeout(resolve, 2));
  if (document.querySelector(".bricks-control-popup")) {
    setTimeout(() => {
      document.querySelector("body")?.click();
      setTimeout(() => {
        showBricksColorPopUp();
      }, 5);
    }, 5);
    logger("Failed to close color picker. Delaying close.", {
      module: "variable-picker",
      type: "error",
    });
  } else {
    showBricksColorPopUp();
  }
}
</script>

<template>
  <div class="{m:10;pb:15}>div">
    <div v-for="(color, key) in variableItems" :key="key" class="">
      <div class="variable-section-title">
        {{ key }}
      </div>

      <template v-if="color.DEFAULT">
        <div class="variable-section-items default-color">
          <button
            v-tooltip="{
              placement: 'top',
              content: `var(${color.DEFAULT.key}, ${color.DEFAULT.value})`,
            }"
            :style="`--wp-b-v-item-bg: var(--${color.DEFAULT.key.slice(2)});`"
            class=""
            @click="(event) => onClick(event, color.DEFAULT.key)"
            @mouseenter="(event) => onMouseEnter(event, color.DEFAULT.key)"
            @mouseleave="onMouseLeave"
          />
        </div>
      </template>

      <!-- if has shades and shades > 0 -->
      <template v-if="color.shades && Object.keys(color.shades).length > 0">
        <div
          :style="`--wp-b-v-items-grid: ${Object.keys(color.shades).length}`"
          class="variable-section-items shades-colors"
        >
          <div v-for="(shade, shadeKey) in color.shades" :key="shadeKey" class="">
            <button
              v-tooltip="{ placement: 'top', content: `var(${shade.key}, ${shade.value})` }"
              :style="`--wp-b-v-item-bg: var(--${shade.key.slice(2)})`"
              @click="(event) => onClick(event, shade.key)"
              @mouseenter="(event) => onMouseEnter(event, shade.key)"
              @mouseleave="onMouseLeave"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.variable-section-title {
  font-size: 14px;
  margin-top: 10px;
  margin-bottom: 10px;
}

.variable-section-items {
  button {
    width: 100%;
    height: 24px;
    border-radius: 4px;
    border: 1px solid transparent;

    background-color: var(--wp-b-v-item-bg);

    &:hover {
      border-color: white;
    }
  }

  &.shades-colors {
    display: grid;
    border-radius: 4px;
    overflow: hidden;
    grid-template-columns: repeat(var(--wp-b-v-items-grid), auto);

    div {
      display: flex;
      gap: 10px;

      button {
        border-radius: 0;
      }

      &:first-child {
        button {
          border-top-left-radius: 4px;
          border-bottom-left-radius: 4px;
        }
      }

      &:last-child {
        button {
          border-top-right-radius: 4px;
          border-bottom-right-radius: 4px;
        }
      }
    }
  }
}
</style>
