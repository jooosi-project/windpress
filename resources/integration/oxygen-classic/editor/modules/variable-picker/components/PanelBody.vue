<script setup>
import { ref, onMounted, watch, inject } from "vue";
import { oxyIframe } from "@/integration/oxygen-classic/editor/constant.js";
import { getVariableList, decodeVFSContainer, loadDesignSystem } from "@/packages/core/tailwindcss";
import ExpansionPanel from "./ExpansionPanel.vue";
import { set } from "lodash-es";
import CommonVariableItems from "./CommonVariableItems.vue";
import ColorVariableItems from "./ColorVariableItems.vue";

const commonVar = ref({
  colors: {},
  typography: {},
  sizing: {},
});

const HOVER_VARIABLE_PREVIEW_TIMEOUT = 1000;

const focusedInput = inject("focusedInput");
const recentVariableSelectionTimestamp = inject("recentVariableSelectionTimestamp");
const tempInputValue = inject("tempInputValue");
const variableApp = inject("variableApp");

async function constructVariableList() {
  const vfsContainer = oxyIframe.contentWindow.document.querySelector(
    'script#windpress\\:vfs[type="text/plain"]',
  );
  const volume = decodeVFSContainer(vfsContainer.textContent);

  // register variables
  const variableLists = await getVariableList(await loadDesignSystem({ volume }));

  let styleElement = variableApp.querySelector("style#windpressoxygen-variable-app-body-style");
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "windpressoxygen-variable-app-body-style";
    variableApp.appendChild(styleElement);
  }

  styleElement.innerHTML = `
        #windpressoxygen-variable-app-body, #oxygen-sidebar {
            ${variableLists.map((variable) => `${variable.key}:${variable.value};`).join("")}
        }
    `;

  /**
   * Color
   */

  const palette = {};

  // find where the key prefixed with '--color-'
  variableLists
    .filter((variable) => variable.key.startsWith("--color"))
    .forEach((color) => {
      const key = color.key.slice(8);
      const segments = key.split("-");

      let colorPath = "";

      if (segments.length > 1) {
        const key = segments[0];
        const shadeKey = segments.slice(1).join("-");
        colorPath = `${key}.shades.'${shadeKey}'`;
      } else {
        colorPath = `${key}.DEFAULT`;
      }

      set(palette, colorPath, color);
    });

  commonVar.value.colors = Object.keys(palette)
    .sort()
    .reduce((acc, key) => {
      acc[key] = palette[key];
      return acc;
    }, {});

  /**
   * Typography
   */

  const typography = {
    font_size: [],
    line_height: [],
    letter_spacing: [],
  };

  // 1. find where the key prefixed with '--text-' and without suffixed '--leading'
  // 2. find where the key prefixed with '--leading-' or suffixed '--leading'
  // 3. find where the key prefixed with '--tracking-'
  variableLists
    .filter(
      (variable) => variable.key.startsWith("--text-") && !variable.key.endsWith("--line-height"),
    )
    .forEach((typo) => {
      const key = typo.key.slice(7);
      typography.font_size.push({
        key: typo.key,
        label: key,
        value: typo.value,
      });
    });

  variableLists
    .filter(
      (variable) => variable.key.startsWith("--leading-") || variable.key.endsWith("--leading"),
    )
    .forEach((typo) => {
      // const key = typo.key.startsWith('--leading-') ? typo.key.slice(10) : typo.key.slice(-9);

      // if (typo.key.startsWith('--leading-')) {
      const key = typo.key.startsWith("--leading-") ? typo.key.slice(10) : typo.key.slice(2, -9);

      typography.line_height.push({
        key: typo.key,
        label: key,
        value: typo.value,
      });
    });

  // sort label. if it prefixed with 'font-size-', then put it last
  typography.line_height.sort((a, b) => {
    if (a.label.startsWith("font-size-") && !b.label.startsWith("font-size-")) {
      return 1;
    }

    if (!a.label.startsWith("font-size-") && b.label.startsWith("font-size-")) {
      return -1;
    }

    return 0;
  });

  variableLists
    .filter((variable) => variable.key.startsWith("--tracking-"))
    .forEach((typo) => {
      const key = typo.key.slice(11);
      typography.letter_spacing.push({
        key: typo.key,
        label: key,
        value: typo.value,
      });
    });

  commonVar.value.typography = typography;

  /**
   * Sizing
   */

  const sizing = {
    // spacing: [],
    container: [],
    breakpoint: [],
  };

  // 1. find where the key prefixed with '--spacing-'
  // 2. find where the key prefixed with '--container-'
  // 3. find where the key prefixed with '--breakpoint-'

  // variableLists
  //     .filter((variable) => variable.key.startsWith('--spacing-'))
  //     .forEach((size) => {
  //         const key = size.key.slice(10);
  //         sizing.spacing.push({
  //             key: size.key,
  //             label: key,
  //             value: size.value,
  //         });
  //     });

  variableLists
    .filter((variable) => variable.key.startsWith("--container-"))
    .forEach((size) => {
      const key = size.key.slice(12);
      sizing.container.push({
        key: size.key,
        label: key,
        value: size.value,
      });
    });

  variableLists
    .filter((variable) => variable.key.startsWith("--breakpoint-"))
    .forEach((size) => {
      const key = size.key.slice(13);
      sizing.breakpoint.push({
        key: size.key,
        label: key,
        value: size.value,
      });
    });

  commonVar.value.sizing = sizing;
}

const sectionColor = ref(null);
const sectionTypography = ref(null);
const sectionSpacing = ref(null);

watch(focusedInput, (value) => {
  if (value) {
    // get the attribute of the closest control for the focused input
    const control = value;
    const isColorInput = control?.parentElement?.classList.contains("oxygen-color-picker");
    const isFontSize = ["font-size"].some((keyword) =>
      control?.getAttribute("data-option")?.includes(keyword),
    );
    const isSpacing = ["padding", "margin", "gap", "width", "height"].some((keyword) =>
      control?.getAttribute("data-option")?.includes(keyword),
    );

    sectionTypography.value.togglePanel(false);
    sectionSpacing.value.togglePanel(false);
    sectionColor.value.togglePanel(false);

    async function swithUnitCustom() {
      value.parentElement
        .querySelector(
          ".oxygen-measure-box-unit-selector .oxygen-measure-box-units .oxygen-measure-box-unit:last-child",
        )
        .click();

      setTimeout(() => {
        value.focus();
      }, 100);
    }

    if (isColorInput) {
      sectionColor.value.togglePanel(true);
      sectionColor.value.scrollIntoView();
    } else if (isFontSize) {
      sectionTypography.value.togglePanel(true);
      sectionTypography.value.scrollIntoView();
      swithUnitCustom();
    } else if (isSpacing) {
      sectionSpacing.value.togglePanel(true);
      sectionSpacing.value.scrollIntoView();
      swithUnitCustom();
    }
  }
});

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

  const isColorInput = focusedInput.value?.parentElement?.classList.contains("oxygen-color-picker");
  if (
    isColorInput &&
    focusedInput.value.parentElement.querySelector(".oxygen-color-picker-color button")
  ) {
    focusedInput.value.parentElement.querySelector(
      ".oxygen-color-picker-color button",
    ).style.backgroundColor = `var(${varKey})`;
  }
}

onMounted(() => {
  constructVariableList();
});

const channel = new BroadcastChannel("windpress");

channel.addEventListener("message", async (e) => {
  const data = e.data;
  const source = "windpress/intellisense";
  const target = "any";
  const task = "windpress.code-editor.saved.done";

  if (data.source === source && data.task === task) {
    setTimeout(() => {
      constructVariableList();
    }, 1000);
  }
});
</script>

<template>
  <div
    id="windpressoxygen-variable-app-body"
    class="var-body bg:$(oxy-dark) fg:$(oxy-light-text) rel w:full h:full overflow-y:scroll! bb:1|solid|gray-60>div:not(:last-child)"
  >
    <ExpansionPanel ref="sectionColor" namespace="variable" name="color">
      <template #header>
        <span class="var-body-title">Color</span>
      </template>

      <template #default>
        <ColorVariableItems
          :variable-items="commonVar.colors"
          @preview-enter="onMouseEnter"
          @preview-leave="onMouseLeave"
          @preview-chose="onClick"
        />
      </template>
    </ExpansionPanel>
    <ExpansionPanel ref="sectionTypography" namespace="variable" name="typography">
      <template #header>
        <span class="var-body-title">Typography</span>
      </template>

      <template #default>
        <CommonVariableItems
          :variable-items="commonVar.typography"
          @preview-enter="onMouseEnter"
          @preview-leave="onMouseLeave"
          @preview-chose="onClick"
        />
      </template>
    </ExpansionPanel>
    <ExpansionPanel ref="sectionSpacing" namespace="variable" name="spacing" class="">
      <template #header>
        <span class="var-body-title">Sizing</span>
      </template>

      <template #default>
        <CommonVariableItems
          :variable-items="commonVar.sizing"
          @preview-enter="onMouseEnter"
          @preview-leave="onMouseLeave"
          @preview-chose="onClick"
        />
      </template>
    </ExpansionPanel>
  </div>
</template>

<style lang="scss" scoped>
.var-body {
  scrollbar-color: var(--oxy-mid) transparent;
  background-color: var(--oxy-dark);
  color: var(--oxy-light-text);
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: scroll !important;

  & > div:not(:last-child) {
    border-bottom: 1px solid var(--oxy-gray-60);
  }

  .var-body-title {
    font-weight: semibold;
  }
}
</style>
