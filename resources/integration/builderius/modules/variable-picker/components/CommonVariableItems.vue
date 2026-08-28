<script setup>
const props = defineProps({
  variableItems: {
    type: Object,
    required: true,
  },
});
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
            class="px:12 py:8 r:8 fg:$(base-1) fg:$(accent-normal):hover bg:$(primary-3) bg:$(primary-2):hover b:0 flex-grow:1 flex-shrink:1 flex-basis:30% cursor:pointer {opacity:.5}>span opacity:100:hover>span"
            @click="(event) => $emit('previewChose', event, subItem.key)"
            @mouseenter="(event) => $emit('previewEnter', event, subItem.key)"
            @mouseleave="$emit('previewLeave')"
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
      border-radius: 8px;
      color: var(--base-1);
      background-color: var(--primary-3);
      border: 0;
      flex-grow: 1;
      flex-shrink: 1;
      flex-basis: 30%;
      text-align: center;
      cursor: pointer;

      span {
        opacity: 0.5;
        font-weight: semibold;
      }

      &:hover {
        background-color: var(--primary-2);

        span {
          opacity: 1;
        }
      }
    }
  }
}
</style>
