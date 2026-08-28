import lightningcssWasmFile from "~/node_modules/lightningcss-wasm/lightningcss_node.wasm?url";
import init, { transform, browserslistToTargets } from "lightningcss-wasm";
import { compile } from "./compile";
import { version as tw3_version } from "tailwindcss3/package.json";
import type { VFSContainer } from "@/packages/core/tailwindcss/vfs";

export type BuildOptions = {
  volume?: VFSContainer;
  [key: string]: any;
  contents?: string[];
  entrypoint?: {
    css?: string;
    config?: string;
  };
};

export async function build({
  contents = [],
  entrypoint = {
    css: "/main.css",
    config: "/tailwind.config.js",
  },
  volume = {},
  ...opts
}: BuildOptions) {
  opts = { contents, entrypoint, volume, ...opts };
  const result = await compile(opts);

  return `/*! tailwindcss v${tw3_version} | MIT License | https://tailwindcss.com */\n${result}`;
}

export async function optimize(css: string, minify: boolean = false) {
  await init(lightningcssWasmFile);

  const { default: browserslist } = await import("browserslist");

  const result = transform({
    filename: "main.css",
    code: new TextEncoder().encode(css),
    minify,
    sourceMap: false,
    targets: browserslistToTargets(browserslist("defaults")),
    errorRecovery: true,
  });

  return {
    code: result.code,
    css: new TextDecoder().decode(result.code),
    warnings: result.warnings,
  };
}
