<script setup>
import { inject } from "vue";

const HOVER_VARIABLE_PREVIEW_TIMEOUT = 1000;

const props = defineProps({
  variableItems: {
    type: Object,
    required: true,
  },
});

const focusedInput = inject("focusedInput");
const recentVariableSelectionTimestamp = inject("recentVariableSelectionTimestamp");
const tempInputValue = inject("tempInputValue");

function onMouseEnter(e, varKey) {
  const timeElapsedBetweenSelections = performance.now() - recentVariableSelectionTimestamp.value;
  const isInCoolDown = timeElapsedBetweenSelections < HOVER_VARIABLE_PREVIEW_TIMEOUT;
  if (isInCoolDown) return;

  if (!focusedInput.value) {
    return;
  }

  focusedInput.value.value = `var(${varKey})`;
  focusedInput.value.dispatchEvent(new Event("input"));
  focusedInput.value.focus();
}

function onMouseLeave(e) {
  if (!focusedInput.value || tempInputValue.value === null) {
    return;
  }

  focusedInput.value.value = tempInputValue.value;
  focusedInput.value.dispatchEvent(new Event("input"));
  focusedInput.value.focus();
}

function onClick(e, varKey) {
  if (!focusedInput.value) {
    return;
  }

  focusedInput.value.value = `var(${varKey})`;
  focusedInput.value.dispatchEvent(new Event("input"));
  focusedInput.value.focus();
  tempInputValue.value = `var(${varKey})`;
  recentVariableSelectionTimestamp.value = performance.now();
}
</script>

<template>
  <div class="{m:10;pb:15}>div">
    <div v-for="(item, key) in variableItems" :key="key" class="var-item">
      <div class="variable-section-title font:14 my:10">
        {{ key.replace("_", "-") }}
      </div>

      <div class="variable-section-items flex flex:row gap:8 flex-wrap:wrap">
        <template v-if="item.length > 0">
          <button
            v-for="(subItem, subItemKey) in item"
            :key="subItemKey"
            v-tooltip="{ placement: 'top', content: `var(${subItem.key}, ${subItem.value})` }"
            class="px:12 py:8 r:$(builder-border-radius) fg:$(builder-color) bg:$(builder-bg-2) bg:$(builder-bg-3):hover b:0 flex-grow:1 flex-shrink:1 flex-basis:30% text:center {opacity:.5;font:semibold}>span opacity:100:hover>span"
            @click="(event) => onClick(event, subItem.key)"
            @mouseenter="(event) => onMouseEnter(event, subItem.key)"
            @mouseleave="onMouseLeave"
          >
            <span class="font:14">{{ subItem.label }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.var-item {
  margin: 10px;
  padding-bottom: 15px;

  .variable-section-title {
    font-size: 14px;
    margin-top: 10px;
    margin-bottom: 10px;
  }

  .variable-section-items {
    display: flex;
    flex-direction: row;
    gap: 8px;
    flex-wrap: wrap;

    button {
      padding: 8px 12px;
      border-radius: var(--builder-border-radius);
      color: var(--builder-color);
      background-color: var(--builder-bg-2);
      border: 0;
      flex-grow: 1;
      flex-shrink: 1;
      flex-basis: 30%;
      text-align: center;

      span {
        opacity: 0.5;
        font-weight: semibold;
      }

      &:hover {
        background-color: var(--builder-bg-3);

        span {
          opacity: 1;
        }
      }
    }
  }
}
</style>
