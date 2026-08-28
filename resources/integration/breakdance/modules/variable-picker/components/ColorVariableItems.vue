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
    <div v-for="(color, key) in variableItems" :key="key" class="">
      <div class="variable-section-title font:14 my:10">
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
            class="w:full r:4 h:24 border:1|solid|transparent border:white:hover cursor:pointer"
            @click="(event) => $emit('previewChose', event, color.DEFAULT.key)"
            @mouseenter="(event) => $emit('previewEnter', event, color.DEFAULT.key)"
            @mouseleave="$emit('previewLeave')"
          />
        </div>
      </template>

      <!-- if has shades and shades > 0 -->
      <template v-if="color.shades && Object.keys(color.shades).length > 0">
        <div
          :style="`--wp-b-v-items-grid: ${Object.keys(color.shades).length}`"
          class="variable-section-items shades-colors grid r:4 overflow:hidden"
        >
          <div v-for="(shade, shadeKey) in color.shades" :key="shadeKey" class="flex gap:10">
            <button
              v-tooltip="{ placement: 'top', content: `var(${shade.key}, ${shade.value})` }"
              :style="`--wp-b-v-item-bg: var(--${shade.key.slice(2)})`"
              class="w:full h:24 border:1|solid|transparent border:white:hover cursor:pointer"
              @click="(event) => $emit('previewChose', event, shade.key)"
              @mouseenter="(event) => $emit('previewEnter', event, shade.key)"
              @mouseleave="$emit('previewLeave')"
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
