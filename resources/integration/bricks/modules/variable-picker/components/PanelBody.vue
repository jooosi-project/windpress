<script setup>
import { ref, onMounted, watch, inject } from "vue";
import { brxIframe } from "@/integration/bricks/constant.js";
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

const focusedInput = inject("focusedInput");
const recentColorPickerTarget = inject("recentColorPickerTarget");

async function constructVariableList() {
  const vfsContainer = brxIframe.contentWindow.document.querySelector(
    'script#windpress\\:vfs[type="text/plain"]',
  );
  const volume = decodeVFSContainer(vfsContainer.textContent);

  // register variables
  const variableLists = await getVariableList(await loadDesignSystem({ volume }));

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
    const control = value.closest("[data-controlkey]");
    const dataControlKey = control?.dataset.controlkey?.toLowerCase() ?? "";
    const isFontSize = ["typography", "font"].some((key) => dataControlKey.includes(key));
    const isSpacing = ["padding", "margin", "gap", "width", "height"].some((key) =>
      dataControlKey.includes(key),
    );
    const isColorInput = value.parentElement?.parentElement?.classList.contains("color-input");

    sectionTypography.value.togglePanel(false);
    sectionSpacing.value.togglePanel(false);
    sectionColor.value.togglePanel(false);
    if (isColorInput) {
      sectionColor.value.togglePanel(true);
      sectionColor.value.scrollIntoView();
    } else if (isFontSize) {
      sectionTypography.value.togglePanel(true);
      sectionTypography.value.scrollIntoView();
    } else if (isSpacing) {
      sectionSpacing.value.togglePanel(true);
      sectionSpacing.value.scrollIntoView();
    }
  }
});

watch(recentColorPickerTarget, (value) => {
  if (value) {
    sectionColor.value.togglePanel(true);
    sectionColor.value.scrollIntoView();
  }
});

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
  <div id="windpressbricks-variable-app-body" class="var-body">
    <ExpansionPanel ref="sectionColor" namespace="variable" name="color">
      <template #header>
        <span class="var-body-title">Color</span>
      </template>

      <template #default>
        <ColorVariableItems :variable-items="commonVar.colors" />
      </template>
    </ExpansionPanel>
    <ExpansionPanel ref="sectionTypography" namespace="variable" name="typography">
      <template #header>
        <span class="var-body-title">Typography</span>
      </template>

      <template #default>
        <CommonVariableItems :variable-items="commonVar.typography" />
      </template>
    </ExpansionPanel>
    <ExpansionPanel ref="sectionSpacing" namespace="variable" name="spacing" class="">
      <template #header>
        <span class="var-body-title">Sizing</span>
      </template>

      <template #default>
        <CommonVariableItems :variable-items="commonVar.sizing" />
      </template>
    </ExpansionPanel>
  </div>
</template>

<style lang="scss" scoped>
.var-body {
  scrollbar-color: var(--builder-gray-5) transparent;
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: scroll !important;

  & > div:not(:last-child) {
    border-bottom: 1px solid var(--builder-border-color);
  }

  .var-body-title {
    font-weight: semibold;
  }
}
</style>
