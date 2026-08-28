<script setup>
import { inject, ref, watch } from "vue";
import { settingsState } from "@/integration/bricks/constant";

const isOpen = inject("isOpen");
const mousePosition = inject("mousePosition");
const containerEl = ref(null);

watch(isOpen, (value) => {
  if (value) {
    // set top and left position based on the current mouse position
    containerEl.value.style.top = `${mousePosition.value.y}px`;
    containerEl.value.style.left = `${mousePosition.value.x}px`;
  }
});
</script>

<template>
  <div
    v-show="isOpen"
    id="windpressbricks-settings-app-container"
    ref="containerEl"
    class="flex flex:column"
  >
    <ul class="w:full">
      <li class="disabled" style="color: var(--bricks-text-dark)">Module: Plain Classes</li>
      <li>
        <span class="label">
          <label for="cb-settings-plain-classes-input-field">Input Field</label>
        </span>
        <span class="buttons">
          <div>
            <div data-control="checkbox" type="checkbox">
              <input
                id="cb-settings-plain-classes-input-field"
                v-model="settingsState('module.plain-classes.input-field', true).value"
                type="checkbox"
              />
            </div>
          </div>
        </span>
      </li>
      <li>
        <span class="label">
          <label for="cb-settings-plain-classes-autocomplete">Autocomplete</label>
        </span>
        <span class="buttons">
          <div>
            <div data-control="checkbox" type="checkbox">
              <input
                id="cb-settings-plain-classes-autocomplete"
                v-model="settingsState('module.plain-classes.autocomplete', true).value"
                type="checkbox"
              />
            </div>
          </div>
        </span>
      </li>
      <li>
        <span class="label">
          <label for="cb-settings-plain-classes-hover-preview-classes">Hover Preview</label>
        </span>
        <span class="buttons">
          <div>
            <div data-control="checkbox" type="checkbox">
              <input
                id="cb-settings-plain-classes-hover-preview-classes"
                v-model="settingsState('module.plain-classes.hover-preview-classes', true).value"
                type="checkbox"
              />
            </div>
          </div>
        </span>
      </li>
      <li class="disabled sep-t" style="color: var(--bricks-text-dark)">Module: Generate Cache</li>
      <li>
        <span class="label">
          <label for="cb-settings-generate-cache-on-save">On Save</label>
        </span>
        <span class="buttons">
          <div>
            <div data-control="checkbox" type="checkbox">
              <input
                id="cb-settings-generate-cache-on-save"
                v-model="settingsState('module.generate-cache.on-save', true).value"
                type="checkbox"
              />
            </div>
          </div>
        </span>
      </li>
      <li class="disabled sep-t" style="color: var(--bricks-text-dark)">Module: HTML2Bricks</li>
      <li>
        <span class="label">
          <label for="cb-settings-html2bricks-copy-paste">Copy-Paste</label>
        </span>
        <span class="buttons">
          <div>
            <div data-control="checkbox" type="checkbox">
              <input
                id="cb-settings-html2bricks-copy-paste"
                v-model="settingsState('module.html2bricks.copy-paste', true).value"
                type="checkbox"
              />
            </div>
          </div>
        </span>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
#windpressbricks-settings-app-container {
  background-color: #fff;
  border-radius: var(--builder-border-radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  position: fixed;
  user-select: none;
  z-index: calc(Infinity - 1) !important;

  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;

    li {
      align-items: center;
      color: var(--bricks-text-medium);
      cursor: pointer;
      display: flex;
      font-family: sans-serif;
      font-size: 12px;
      font-weight: 700;
      gap: 4px;
      justify-content: space-between;
      letter-spacing: 0.2px;
      line-height: 36px;
      padding: 0 1em;

      &:first-child {
        border-top-left-radius: var(--builder-border-radius);
        border-top-right-radius: var(--builder-border-radius);
      }

      &:last-child {
        border-bottom-left-radius: var(--builder-border-radius);
        border-bottom-right-radius: var(--builder-border-radius);
      }

      &:hover:not(.convert) {
        background-color: var(--builder-bg);
        color: #fff;

        .action {
          background-color: var(--builder-gray-4);

          &:hover {
            background-color: var(--builder-color-accent);
            color: var(--builder-color-accent-inverse);
          }
        }
      }

      &:hover:not(.convert).delete {
        background-color: var(--bricks-text-danger);
      }

      &:hover:not(.convert).save {
        background-color: var(--bricks-text-success);
      }

      &.sep,
      &.sep-b {
        border-bottom: 1px solid var(--builder-gray-d);
      }

      &.sep-t {
        border-top: 1px solid var(--builder-gray-d);
      }

      &.disabled {
        background-color: inherit;
        color: var(--bricks-text-light);
        cursor: default;
        pointer-events: none !important;
      }

      &.convert {
        cursor: default;
      }

      a {
        width: 100%;
      }

      span {
        color: inherit;
        display: inline-block;
        position: relative;
      }

      .label {
        flex-grow: 1;

        label {
          cursor: pointer;
          color: inherit;
          font-weight: 700;
          margin-bottom: 0;
        }
      }

      .action {
        align-items: center;
        background-color: var(--builder-gray-e);
        border-radius: var(--builder-border-radius);
        display: inline-flex;
        height: 20px;
        justify-content: center;
        width: 20px;

        svg {
          height: 12px;
        }
      }

      .shortcut {
        font-size: 11px;
        opacity: 0.5;
      }

      .buttons {
        cursor: pointer;
        display: flex;
        font-size: 14px;
        gap: 8px;
      }
    }
  }
}
</style>
