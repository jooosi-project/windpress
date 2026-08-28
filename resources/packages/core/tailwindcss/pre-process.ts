import postcss from "postcss";
import postcssNested from "postcss-nested";

import type { LoadDesignSystemOptions } from "./design-system";
import type { VFSContainer } from "./vfs";

export async function preprocess({
  entrypoint = "/main.css",
  volume = {} as VFSContainer,
  ...opts
}: LoadDesignSystemOptions = {}) {
  opts = { entrypoint, volume, ...opts };

  const processor = postcss().use(postcssNested());

  const result = await processor.process(opts.volume[opts.entrypoint], {
    from: opts.entrypoint,
    parser: opts.parser || null,
  });

  return {
    css: result.css,
  };
}
