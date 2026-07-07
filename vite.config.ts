import { defineConfig } from "vite-plus";
import vue from "@vitejs/plugin-vue";
import react from "@vitejs/plugin-react";
import { wordpress, wordpressExternals } from "@nabasa/vp-wp";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";
import svgr from "vite-plugin-svgr";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
// import httpsImports from 'vite-plugin-https-imports'; //
import nuxtUi from "@nuxt/ui/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";


export default defineConfig({
  lint: {
    ignorePatterns: ["dist/**"],
    plugins: ["oxc", "typescript", "unicorn", "react", "vue"],
    categories: {
      correctness: "warn",
    },
    env: {
      builtin: true,
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "error",
      "no-array-constructor": "error",
      "@typescript-eslint/no-duplicate-enum-values": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-extra-non-null-assertion": "error",
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-namespace": "error",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-this-alias": "error",
      "@typescript-eslint/no-unnecessary-type-constraint": "error",
      "@typescript-eslint/no-unsafe-declaration-merging": "error",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "no-unused-expressions": "error",
      "no-unused-vars": "error",
      "@typescript-eslint/no-wrapper-object-types": "error",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/prefer-namespace-keyword": "error",
      "@typescript-eslint/triple-slash-reference": "error",
      "vue/no-arrow-functions-in-watch": "error",
      "vue/no-deprecated-destroyed-lifecycle": "error",
      "vue/no-export-in-script-setup": "error",
      "vue/no-lifecycle-after-await": "error",
      "vue/prefer-import-from-vue": "error",
      "vue/valid-define-emits": "error",
      "vue/valid-define-props": "error",
      "vue/no-multiple-slot-args": "warn",
      "vue/no-required-prop-with-default": "warn",
    },
    overrides: [
      {
        files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
        rules: {
          "constructor-super": "off",
          "getter-return": "off",
          "no-class-assign": "off",
          "no-const-assign": "off",
          "no-dupe-class-members": "off",
          "no-dupe-keys": "off",
          "no-func-assign": "off",
          "no-import-assign": "off",
          "no-new-native-nonconstructor": "off",
          "no-obj-calls": "off",
          "no-redeclare": "off",
          "no-setter-return": "off",
          "no-this-before-super": "off",
          "no-undef": "off",
          "no-unreachable": "off",
          "no-unsafe-negation": "off",
          "no-var": "error",
          "no-with": "off",
          "prefer-const": "error",
          "prefer-rest-params": "error",
          "prefer-spread": "error",
        },
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  define: {
    __dirname: JSON.stringify("/"),
    "process.versions.node": JSON.stringify("22.9.0"),
  },
  optimizeDeps: {
    exclude: ["@windpress/oxide-parser"],
  },
  build: {
    target: "es2020",
  },
  plugins: [
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      // Override the default polyfills for specific modules.
      overrides: {
        fs: "memfs", // Since `fs` is not supported in browsers, we can use the `memfs` package to polyfill it.
      },
    }),
    vue(),
    react({
      jsxRuntime: "classic",
    }),
    nuxtUi({
      components: {
        resolvers: [IconsResolver()],

        // relative paths to the directory to search for components.
        dirs: "assets/dashboard/components",

        // Allow subdirectories as namespace prefix for components.
        directoryAsNamespace: true,

        // Collapse same prefixes (camel-sensitive) of folders and components
        // to prevent duplication inside namespaced component name.
        // works when `directoryAsNamespace: true`
        collapseSamePrefixes: true,
      },
      ui: {
        colors: {
          primary: "indigo",
          neutral: "zinc",
        },
        commandPalette: {
          slots: {
            root: "z-[10001]",
          },
        },
      },
    }),
    Icons({ autoInstall: true, scale: 1 }),
    svgr({
      svgrOptions: {
        dimensions: false,
      },
      oxcOptions: {
        jsx: {
          runtime: 'classic',
        },
      },
    }),
    wordpress({
      entry: {
        dashboard: "assets/dashboard/main.ts",

        // Tailwind v4
        "packages/core/tailwindcss/play/observer":
          "assets/packages/core/tailwindcss/play/observer.ts",
        "packages/core/tailwindcss/play/intellisense":
          "assets/packages/core/tailwindcss/play/intellisense.ts",
        "packages/core/tailwindcss/play/worker": "assets/packages/core/tailwindcss/play/worker.ts",

        // Tailwind v3
        "packages/core/tailwindcss-v3/play/observer":
          "assets/packages/core/tailwindcss-v3/play/observer.ts",
        "packages/core/tailwindcss-v3/play/intellisense":
          "assets/packages/core/tailwindcss-v3/play/intellisense.ts",

        // Integrations
        "integration/gutenberg/post-editor": "assets/integration/gutenberg/post-editor.js",
        "integration/gutenberg/site-editor": "assets/integration/gutenberg/site-editor.js",
        "integration/gutenberg/block-editor": "assets/integration/gutenberg/block-editor.jsx",
        "integration/gutenberg/modules/generate-cache":
          "assets/integration/gutenberg/modules/generate-cache/main.ts",
        "integration/gutenberg/common-block": "assets/integration/gutenberg/common-block/index.jsx",
        "integration/gutenberg/isolate-styles":
          "assets/integration/gutenberg/common-block/isolate-styles.js",
        "integration/bricks": "assets/integration/bricks/main.js",
        "integration/oxygen": "assets/integration/oxygen/main.js",
        "integration/oxygen-classic/iframe": "assets/integration/oxygen-classic/iframe/main.js",
        "integration/oxygen-classic/editor": "assets/integration/oxygen-classic/editor/main.js",
        "integration/livecanvas": "assets/integration/livecanvas/main.js",
        "integration/breakdance": "assets/integration/breakdance/main.js",
        "integration/builderius": "assets/integration/builderius/main.js",
        "integration/etch": "assets/integration/etch/main.js",
      },
      outDir: "build",
      sourcemap: false,
    }),
    wordpressExternals(),
    // httpsImports.default({}, function resolver(matcher) {
    //     return (id, importer) => {
    //         if (matcher(id)) {
    //             return id;
    //         }
    //         else if (matcher(importer) && !id.includes('vite-plugin-node-polyfills')) {
    //             return new URL(id, importer).toString();
    //         }
    //         return undefined;
    //     };
    // }),
    viteStaticCopy({
      targets: [
        {
          src: "assets/wp-i18n.js",
          dest: "./",
        },
        {
          src: "assets/integration/gutenberg/common-block/block.json",
          dest: "blocks/common-block/",
        },
      ],
    }),
  ],
  // build: {
  //   rollupOptions: {
  //     output: {
  //       chunkFileNames: (chunkInfo) => {
  //         // if the process.env.WP_I18N is available and true, add .min to the vendor module to exclude it from the `wp i18n make-pot` command.
  //         // if (process.env.WP_I18N !== 'true') {
  //         //     return 'chunks/[name]-[hash].min.js';
  //         // }

  //         // add .min to the vendor module to exclude it from the `wp i18n make-pot` command.
  //         // @see https://developer.wordpress.org/cli/commands/i18n/make-pot/

  //         if (chunkInfo.name === "monaco-editor") {
  //           return "assets/[name]-[hash].min.js";
  //         }

  //         return chunkInfo.name !== "plugin" &&
  //           chunkInfo.moduleIds.some((id) => id.includes("assets") && !id.includes("node_modules"))
  //           ? "assets/[name]-[hash].js"
  //           : "assets/[name]-[hash].min.js";
  //       },
  //       // entryFileNames: (chunkInfo) => {
  //       //     return process.env.WP_I18N !== 'true' ? "assets/[name]-[hash].min.js" : "assets/[name]-[hash].js";
  //       // },
  //     },
  //   },
  //   // minify: false, // Uncomment this for debugging purposes, otherwise it will minify the code.
  //   cssMinify: "lightningcss",
  //   minify: true,
  // },
  // worker: {
  //   rollupOptions: {
  //     output: {
  //       // add .min to the worker filename to exclude it from the `wp i18n make-pot` command.
  //       // @see https://developer.wordpress.org/cli/commands/i18n/make-pot/
  //       entryFileNames: "assets/[name]-[hash].min.js",
  //       chunkFileNames: "assets/[name]-[hash].min.js",
  //     },
  //   },
  // },
  // css: {
  //   transformer: "lightningcss",
  // },
  publicDir: "assets/static",
  resolve: {
    alias: {
      "~": path.resolve(__dirname), // root directory
      "@": path.resolve(__dirname, "./assets"),
      // "source-map-js": "source-map",
    },
  },
  server: {
    cors: true,

    // BrowserStackLocal
    allowedHosts: true,
    origin: "http://localhost:3000",
    port: 3000,
  },
});
