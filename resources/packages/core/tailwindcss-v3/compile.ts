import path from "path";
import postcss from "postcss";
import postcssImport from "postcss-import";
import tailwindcssPostcssPlugin from "./postcss-plugins/tailwindcss/index";
import tailwindcssNesting from "tailwindcss3/src/postcss-plugins/nesting";
import { resolveConfig } from "./resolve-config";
import { isValidUrl } from "@/packages/core/tailwindcss/utils";
import type { VFSContainer } from "@/packages/core/tailwindcss/vfs";

export type LoadDesignSystemOptions = {
  contents: string[] | object[];
  volume?: VFSContainer;
  entrypoint: {
    css: string;
    config: string;
  };
  [key: string]: any;
};

export async function compile({
  contents = [],
  volume = {} as VFSContainer,
  ..._opts
}: LoadDesignSystemOptions) {
  const opts: LoadDesignSystemOptions = { contents, volume, ..._opts };
  opts.contents = opts.contents.map((content: string | object) =>
    typeof content === "string" ? { content } : content,
  );

  const config = await resolveConfig(opts.volume, opts.entrypoint.config);

  const processor = postcss()
    .use(
      postcssImport({
        filter: () => true,
        async resolve(id: string, basedir: string) {
          if (isValidUrl(id)) {
            return new URL(id).toString();
          } else {
            // Volume: resolve relative path as absolute path
            if (id.startsWith(".")) {
              id = path.resolve(path.dirname(basedir), id);

              /*
               * Resolve default import if no extension is specified
               * */
              if (!id.endsWith(".css")) {
                if (
                  Object.keys(opts.volume ?? {}).some((file) => file.includes(id.concat(".css")))
                ) {
                  id = id.concat(".css");
                } else {
                  id = id.concat("/index.css");
                }
              }
            }

            // check if the file is in the volume
            let _path = path.resolve(basedir, id);

            if (opts.volume?.[_path]) {
              return _path;
            }

            /*
             * Resolve default import if no extension is specified
             * */
            if (!id.endsWith(".css")) {
              id = id.concat("/index.css");
            }

            _path = path.join(basedir, id);

            if (opts.volume?.[_path]) {
              return _path;
            }

            // CDN

            // fetch and store in volume
            await fetch(`https://esm.sh${_path}`)
              .then((response) => response.text())
              .then((data) => {
                data = data
                  // resolve the `@config '|"` imports paths to absolute paths with cdn
                  .replace(/@config\s+['|"](.*)['|"]/g, (match, p1) => {
                    return `@config 'https://esm.sh${path.resolve(path.dirname(id))}${path.resolve(p1)}'`;
                  })
                  // resolve the `@plugin '|"` imports paths to absolute paths with cdn
                  .replace(/@plugin\s+['|"](.*)['|"]/g, (match, p1) => {
                    return `@plugin 'https://esm.sh${path.resolve(path.dirname(id))}${path.resolve(p1)}'`;
                  });

                if (opts.volume) {
                  opts.volume[_path] = data;
                }
              });

            return _path;
          }
        },
        load(file) {
          if (isValidUrl(file)) {
            return fetch(file).then((response) => response.text());
          }

          if (opts.volume?.[file]) {
            return opts.volume[file];
          }

          // Provide a fallback to ensure a string is always returned
          return "";
        },
      }),
    )
    .use(tailwindcssPostcssPlugin(config, opts.contents))
    .use(tailwindcssNesting());

  return await processor
    .process((opts.volume ?? {})[opts.entrypoint.css], { from: undefined })
    .then((result) => result.css);
}
