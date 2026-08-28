import { sortClasses } from "../intellisense";

import type { DesignSystem } from "@tailwindcss/root/packages/tailwindcss/src/design-system";

export async function classSorter(design: DesignSystem, input: string) {
  const classes = input.split(/\s+/).filter((x) => x !== "" && x !== "|");

  return (await sortClasses(design, classes)).join(" ");
}
