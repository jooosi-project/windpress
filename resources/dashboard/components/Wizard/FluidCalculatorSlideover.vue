<script lang="ts">
export type FluidCalculatorData = {
  minSize: number;
  maxSize: number;
  minScale: number;
  maxScale: number;
  minViewport: number;
  maxViewport: number;
  stepsSmaller: number;
  stepsLarger: number;
  miscPrefix: string;
};

export function calcFluid(
  minSize: number,
  maxSize: number,
  minWidth: number,
  maxWidth: number,
): string {
  // Calculate the slope
  const slope: number = (maxSize - minSize) / (maxWidth - minWidth);

  // Calculate the y-intersection
  const yIntersection: number = -1 * minWidth * slope + minSize;

  // Return the clamp CSS
  return `clamp(${parseFloat((minSize / 16).toFixed(4).toString())}rem, ${parseFloat((yIntersection / 16).toFixed(4).toString())}rem + ${parseFloat((slope * 100).toFixed(4).toString())}vw, ${parseFloat((maxSize / 16).toFixed(4).toString())}rem)`;
}
</script>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import { __ } from "@wordpress/i18n";
import { ref, computed } from "vue";

const emit = defineEmits(["close"]);

const scales = ref([
  {
    name: __("Perfect Unison", "windpress"),
    decimal: 1,
    fractional: [1, 1],
  },
  {
    name: __("Minor Second", "windpress"),
    decimal: 1.067,
    fractional: [16, 15],
  },
  {
    name: __("Major Second", "windpress"),
    decimal: 1.125,
    fractional: [9, 8],
  },
  {
    name: __("Minor Third", "windpress"),
    decimal: 1.2,
    fractional: [6, 5],
  },
  {
    name: __("Major Third", "windpress"),
    decimal: 1.25,
    fractional: [5, 4],
  },
  {
    name: __("Perfect Fourth", "windpress"),
    decimal: 1.333,
    fractional: [4, 3],
  },
  {
    name: __("Tritone", "windpress"),
    decimal: 1.414,
    fractional: [Math.sqrt(2), 1],
  },
  {
    name: __("Perfect Fifth", "windpress"),
    decimal: 1.5,
    fractional: [3, 2],
  },
  {
    name: __("Minor Sixth", "windpress"),
    decimal: 1.6,
    fractional: [8, 5],
  },
  {
    name: __("Golden Ratio", "windpress"),
    decimal: 1.618,
    fractional: [89, 55],
  },
  {
    name: __("Major Sixth", "windpress"),
    decimal: 1.667,
    fractional: [5, 3],
  },
  {
    name: __("Minor Seventh", "windpress"),
    decimal: 1.778,
    fractional: [16, 9],
  },
  {
    name: __("Major Seventh", "windpress"),
    decimal: 1.875,
    fractional: [15, 8],
  },
  {
    name: __("Perfect Octave", "windpress"),
    decimal: 2,
    fractional: [2, 1],
  },
]);

const scalesWithLabels = computed(() => {
  return scales.value.map((scale) => {
    return {
      ...scale,
      label: `${scale.name} (${scale.decimal})`,
    };
  });
});

const defaultFluid = useStorage("windpress.ui.wizard.fluid-calculator", {
  minSize: 18,
  maxSize: 20,
  minScale: scalesWithLabels.value[3],
  maxScale: scalesWithLabels.value[4],
  minViewport: 320,
  maxViewport: 1400,
  stepsSmaller: 4,
  stepsLarger: 4,
  miscPrefix: "fluid-",
});

function onCreateScale(val: string, which: "min" | "max" = "min") {
  if (!val || !val.trim() || isNaN(parseFloat(val))) {
    return;
  }

  const parts = val.split("/").map((v) => v.trim());
  const decimal = parts.reduce((acc, curr) => acc * parseFloat(curr), 1);
  const fractional = parts.map((v) => {
    const trimmed = v.trim();
    return isNaN(parseFloat(trimmed)) ? 1 : parseFloat(trimmed);
  });
  if (isNaN(decimal) || decimal <= 0) {
    return;
  }
  if (fractional.length === 1) {
    fractional.push(1); // Ensure we have a denominator
  }
  if (fractional.some((f) => isNaN(f) || f <= 0)) {
    return;
  }

  scales.value.push({
    name: val,
    decimal: decimal,
    fractional: fractional,
  });

  const lastScale = scalesWithLabels.value[scalesWithLabels.value.length - 1];

  // defaultFluid.value.minScale = lastScale;
  if (which === "min") {
    defaultFluid.value.minScale = lastScale;
  } else {
    defaultFluid.value.maxScale = lastScale;
  }
}

function submitForm() {
  if (
    !confirm(__("Are you sure you want to generate the fluid scale and import it?", "windpress"))
  ) {
    return;
  }

  emit("close", {
    minSize: defaultFluid.value.minSize,
    maxSize: defaultFluid.value.maxSize,
    minScale: parseFloat(
      String(defaultFluid.value.minScale.decimal ?? defaultFluid.value.minScale.label),
    ),
    maxScale: parseFloat(
      String(defaultFluid.value.maxScale.decimal ?? defaultFluid.value.maxScale.label),
    ),
    minViewport: defaultFluid.value.minViewport,
    maxViewport: defaultFluid.value.maxViewport,
    stepsSmaller: defaultFluid.value.stepsSmaller,
    stepsLarger: defaultFluid.value.stepsLarger,
    miscPrefix: defaultFluid.value.miscPrefix,
  } as FluidCalculatorData);
}
</script>

<template>
  <USlideover
    :title="i18n.__('Fluid Calculator', 'windpress')"
    :ui="{ content: 'top-(--wp-admin--admin-bar--height) bottom-0' }"
  >
    <template #body>
      <div class="grid gap-4">
        <div class="text-base text-pretty font-semibold text-highlighted">
          {{ __("Min Viewport", "windpress") }}
        </div>
        <div>
          <UInput
            v-model="defaultFluid.minSize"
            type="number"
            required
            :ui="{ trailing: 'pointer-events-none', base: 'peer' }"
            class="w-full"
          >
            <label
              class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            >
              <span class="inline-flex bg-default px-1">{{ i18n.__("Size", "windpress") }}</span>
            </label>

            <template #trailing>
              <div class="text-xs text-muted tabular-nums">px</div>
            </template>
          </UInput>
        </div>
        <div>
          <UInput
            v-model="defaultFluid.minViewport"
            type="number"
            required
            :ui="{ trailing: 'pointer-events-none', base: 'peer' }"
            class="w-full"
          >
            <label
              class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            >
              <span class="inline-flex bg-default px-1">{{
                i18n.__("Viewport", "windpress")
              }}</span>
            </label>

            <template #trailing>
              <div class="text-xs text-muted tabular-nums">px</div>
            </template>
          </UInput>
        </div>
        <div>
          <div class="peer relative inline-flex items-center w-full">
            <UInputMenu
              v-model="defaultFluid.minScale"
              create-item
              :items="scalesWithLabels"
              :loading="false"
              @create="(val) => onCreateScale(val, 'min')"
              class="w-full"
            />
            <label
              class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            >
              <span class="inline-flex bg-default px-1">{{
                i18n.__("Scale ratio", "windpress")
              }}</span>
            </label>
          </div>
        </div>
      </div>

      <USeparator class="my-4" />

      <div class="grid gap-4">
        <div class="text-base text-pretty font-semibold text-highlighted">
          {{ __("Max Viewport", "windpress") }}
        </div>
        <div>
          <UInput
            v-model="defaultFluid.maxSize"
            type="number"
            required
            :ui="{ trailing: 'pointer-events-none', base: 'peer' }"
            class="w-full"
          >
            <label
              class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            >
              <span class="inline-flex bg-default px-1">{{ i18n.__("Size", "windpress") }}</span>
            </label>

            <template #trailing>
              <div class="text-xs text-muted tabular-nums">px</div>
            </template>
          </UInput>
        </div>
        <div>
          <UInput
            v-model="defaultFluid.maxViewport"
            type="number"
            required
            :ui="{ trailing: 'pointer-events-none', base: 'peer' }"
            class="w-full"
          >
            <label
              class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            >
              <span class="inline-flex bg-default px-1">{{
                i18n.__("Viewport", "windpress")
              }}</span>
            </label>

            <template #trailing>
              <div class="text-xs text-muted tabular-nums">px</div>
            </template>
          </UInput>
        </div>
        <div>
          <div class="peer relative inline-flex items-center w-full">
            <UInputMenu
              v-model="defaultFluid.maxScale"
              create-item
              :items="scalesWithLabels"
              :loading="false"
              @create="(val) => onCreateScale(val, 'max')"
              class="w-full"
            />
            <label
              class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            >
              <span class="inline-flex bg-default px-1">{{
                i18n.__("Scale ratio", "windpress")
              }}</span>
            </label>
          </div>
        </div>
      </div>

      <USeparator class="my-4" />

      <div class="grid gap-4">
        <div class="text-base text-pretty font-semibold text-highlighted">
          {{ __("Scale Steps", "windpress") }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="peer relative inline-flex items-center w-full">
            <UInputNumber
              v-model="defaultFluid.stepsSmaller"
              :min="0"
              :step="1"
              required
              class="w-full"
            />

            <label
              class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            >
              <span class="inline-flex bg-default px-1">{{
                i18n.__("Smaller steps", "windpress")
              }}</span>
            </label>
          </div>
          <div class="peer relative inline-flex items-center w-full">
            <UInputNumber
              v-model="defaultFluid.stepsLarger"
              :min="0"
              :step="1"
              required
              class="w-full"
            />
            <label
              class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            >
              <span class="inline-flex bg-default px-1">{{
                i18n.__("Larger steps", "windpress")
              }}</span>
            </label>
          </div>
        </div>

        <div class="grid gap-2.5 grid-cols-5 text-center select-none text-default">
          <div
            @click="defaultFluid.stepsSmaller++"
            class="stripe-bg flex items-center border border-transparent hover:border-muted cursor-pointer font-semibold justify-center px-4 py-2.5 rounded-md"
          >
            <UIcon name="lucide:plus" class="text-tonned" />
          </div>
          <div
            v-for="step in defaultFluid.stepsSmaller"
            :key="step"
            @click="defaultFluid.stepsSmaller -= step === 1 ? 1 : 0"
            :class="step === 1 ? 'cursor-pointer hover:border-muted' : ''"
            class="flex items-center bg-elevated border border-transparent justify-center px-4 py-2.5 rounded-md"
          >
            <span v-if="step === defaultFluid.stepsSmaller">sm</span>
            <span v-else-if="step === defaultFluid.stepsSmaller - 1">xs</span>
            <span v-else>{{ defaultFluid.stepsSmaller - step }}xs</span>
          </div>
          <div
            class="flex items-center text-inverted bg-primary font-semibold justify-center px-4 py-2.5 rounded-md"
          >
            base
          </div>
          <div
            v-for="step in defaultFluid.stepsLarger"
            :key="step"
            @click="defaultFluid.stepsLarger -= step === defaultFluid.stepsLarger ? 1 : 0"
            :class="step === defaultFluid.stepsLarger ? 'cursor-pointer hover:border-muted' : ''"
            class="flex items-center bg-accented border border-transparent font-semibold justify-center px-4 py-2.5 rounded-md"
          >
            <span v-if="step === 1">lg</span>
            <span v-else-if="step === 2">xl</span>
            <span v-else>{{ step - 1 }}xl</span>
          </div>
          <div
            @click="defaultFluid.stepsLarger++"
            class="stripe-bg flex items-center border border-transparent hover:border-muted cursor-pointer font-semibold justify-center px-4 py-2.5 rounded-md"
          >
            <UIcon name="lucide:plus" class="text-tonned" />
          </div>
        </div>
      </div>

      <USeparator class="my-4" />

      <div class="grid gap-4">
        <div class="text-base text-pretty font-semibold text-highlighted">
          {{ __("Misc", "windpress") }}
        </div>
        <div>
          <UInput
            v-model="defaultFluid.miscPrefix"
            required
            :placeholder="i18n.__('prefix-', 'windpress')"
            :ui="{ trailing: 'pointer-events-none', base: 'peer' }"
            class="w-full"
          >
            <label
              class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
            >
              <span class="inline-flex bg-default px-1">{{ i18n.__("Prefix", "windpress") }}</span>
            </label>
          </UInput>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        :label="i18n.__('Generate', 'windpress')"
        color="info"
        variant="soft"
        @click="submitForm"
        leading-icon="lucide:sparkles"
        :ui="{ leadingIcon: 'opacity-60' }"
      />
    </template>
  </USlideover>
</template>

<style lang="scss" scoped>
.stripe-bg {
  background-size: 7.5px 7.5px;
  background-image: linear-gradient(
    135deg,
    rgba(99, 105, 124, 0.25) 4.5%,
    transparent 0,
    transparent 50%,
    rgba(99, 105, 124, 0.25) 0,
    rgba(99, 105, 124, 0.25) 54.5%,
    transparent 0,
    transparent
  );
  background-color: rgba(99, 105, 124, 0.025);
}
</style>
