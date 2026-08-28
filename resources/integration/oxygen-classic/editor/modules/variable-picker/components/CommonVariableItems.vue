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
            class="px:12 py:8 r:8 font:medium fg:$(oxy-light-text) bg:$(oxy-mid) bg:$(oxy-hover):hover b:0 flex-grow:1 flex-shrink:1 flex-basis:30% cursor:pointer {opacity:.5}>span opacity:100:hover>span"
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
      //   {opacity:.5}>span opacity:100:hover>span

      padding: 8px 12px;
      border-radius: 8px;
      color: var(--oxy-light-text);
      background-color: var(--oxy-mid);
      border: none;
      flex-grow: 1;
      flex-shrink: 1;
      flex-basis: 30%;
      cursor: pointer;
      font-weight: medium;

      span {
        font-size: 14px;
        opacity: 0.5;

        &:hover {
          opacity: 1;
        }
      }

      &:hover {
        background-color: var(--oxy-hover);
      }
    }
  }
}
</style>
