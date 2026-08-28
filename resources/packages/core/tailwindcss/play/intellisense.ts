import { set } from "lodash-es";
import { loadDesignSystem } from "../design-system";
import { decodeVFSContainer, type VFSContainer } from "../vfs";

import { classnameToCss } from "./classname-to-css";
import { classSorter } from "./sort";
import { searchClassList, invalidateCache } from "./autocomplete";

import type { DesignSystem } from "@tailwindcss/root/packages/tailwindcss/src/design-system";

const channel = new BroadcastChannel("windpress");
const vfsContainer = document.querySelector('script#windpress\\:vfs[type="text/plain"]');

let design: DesignSystem | null = null;
let volume: VFSContainer = {};
let updateRevision = 0;
let updateDesignPromise: Promise<void> = Promise.resolve();

async function updateDesign() {
  const revision = ++updateRevision;
  const newVolume = decodeVFSContainer(vfsContainer?.textContent || "e30=");
  const volumeChanged = JSON.stringify(volume) !== JSON.stringify(newVolume);
  const newDesign = await loadDesignSystem({ volume: newVolume });

  if (revision !== updateRevision) {
    return;
  }

  if (volumeChanged) {
    invalidateCache();
  }

  volume = newVolume;
  design = newDesign;

  channel.postMessage({
    source: "windpress/intellisense",
    target: "any",
    task: `windpress.code-editor.saved.done`,
  });
}

function scheduleDesignUpdate() {
  updateDesignPromise = updateDesign().catch((error) => {
    console.warn("Failed to load Tailwind CSS design system:", error);
  });

  return updateDesignPromise;
}

// initial load
scheduleDesignUpdate();

channel.addEventListener("message", async (e) => {
  const data = e.data;
  const source = "windpress/dashboard";
  const target = "windpress/intellisense";
  const task = "windpress.code-editor.saved";

  if (data.source === source && data.target === target && data.task === task) {
    scheduleDesignUpdate();
  }
});

set(window, "windpress.module.autocomplete.query", (q: string) => {
  if (!design) {
    return [];
  }

  return searchClassList(volume, design, q);
});
set(window, "windpress.module.classnameToCss.generate", async (input: string) => {
  await updateDesignPromise;

  if (!design) {
    return "";
  }

  return classnameToCss(design, input);
});
set(window, "windpress.module.classSorter.sort", async (input: string) => {
  await updateDesignPromise;

  if (!design) {
    return input;
  }

  return classSorter(design, input);
});
