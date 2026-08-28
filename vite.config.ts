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
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import IconsResolver from "unplugin-icons/resolver";
// import httpsImports from 'vite-plugin-https-imports'; //
import nuxtUi from "@nuxt/ui/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  lint: {
    ignorePatterns: ["dist/**", "resources/packages/oxide-parser/pkg/**"],
    plugins: ["oxc", "typescript", "unicorn", "react", "vue"],
    categories: {
      correctness: "warn",
    },
    env: {
      builtin: true,
    },
    globals: {
      IconLucideCode2: 'readonly',
      IconLucideDownload: 'readonly',
      IconLucideMonitorCog: 'readonly',
      IconLucideMoon: 'readonly',
      IconLucideSun: 'readonly',
      IconLucideTrash2: 'readonly',
      IconLucideUpload: 'readonly',
      IconTablerReorder: 'readonly',
      IconWindpressWindpress: 'readonly',
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
    include: ["modern-monaco > typescript"],
    // modern-monaco creates workers from relative module URLs. Pre-bundling it
    // moves the editor entry into `.vite/deps` without its worker entry points.
    exclude: ["@windpress/oxide-parser", "modern-monaco"],
  },
  build: {
    target: "es2020",
  },
  // WordPress's production JSX runtime exposes jsx/jsxs, but not jsxDEV.
  // Keep automatic JSX on the shared runtime API during Vite development too.
  oxc: {
    jsx: {
      development: false,
    },
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
      jsxRuntime: "automatic",
    }),
    nuxtUi({
      autoImport: {
        dts: 'auto-imports.d.ts',
        resolvers: [
          IconsResolver({
            customCollections: ['windpress'],
            extension: 'jsx',
            prefix: 'Icon',
          }),
        ],
      },
      components: {
        resolvers: [IconsResolver()],
        dirs: "resources/dashboard/components",
        directoryAsNamespace: true,
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
    Icons({
      compiler: 'jsx',
      jsx: 'react',
      autoInstall: true,
      scale: 1,
      customCollections: {
        windpress: FileSystemIconLoader('.'),
      },
    }),
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
        dashboard: 'resources/dashboard/main.ts',

        // Tailwind v4
        "packages/core/tailwindcss/play/observer":
          'resources/packages/core/tailwindcss/play/observer.ts',
        "packages/core/tailwindcss/play/intellisense":
          'resources/packages/core/tailwindcss/play/intellisense.ts',
        "packages/core/tailwindcss/play/worker":
          'resources/packages/core/tailwindcss/play/worker.ts',

        // Tailwind v3
        "packages/core/tailwindcss-v3/play/observer":
          'resources/packages/core/tailwindcss-v3/play/observer.ts',
        "packages/core/tailwindcss-v3/play/intellisense":
          'resources/packages/core/tailwindcss-v3/play/intellisense.ts',

        // Integrations
        "integration/gutenberg/post-editor": "resources/integration/gutenberg/post-editor.js",
        "integration/gutenberg/site-editor": "resources/integration/gutenberg/site-editor.js",
        "integration/gutenberg/block-editor": "resources/integration/gutenberg/block-editor.jsx",
        "integration/gutenberg/modules/generate-cache":
          "resources/integration/gutenberg/modules/generate-cache/main.ts",
        "integration/gutenberg/common-block": "resources/integration/gutenberg/common-block/index.jsx",
        "integration/gutenberg/isolate-styles":
          "resources/integration/gutenberg/common-block/isolate-styles.js",
        "integration/bricks": "resources/integration/bricks/main.js",
        "integration/oxygen": "resources/integration/oxygen/main.js",
        "integration/oxygen-classic/iframe": "resources/integration/oxygen-classic/iframe/main.js",
        "integration/oxygen-classic/editor": "resources/integration/oxygen-classic/editor/main.js",
        "integration/livecanvas": "resources/integration/livecanvas/main.js",
        "integration/breakdance": "resources/integration/breakdance/main.js",
        "integration/builderius": "resources/integration/builderius/main.js",
        "integration/etch": "resources/integration/etch/main.js",
      },
      outDir: 'assets/dist',
      sourcemap: false,
    }),
    wordpressExternals({ preset: 'wordpress+react' }),
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
          src: "resources/wp-i18n.js",
          dest: "./",
        },
        {
          src: "resources/integration/gutenberg/common-block/block.json",
          dest: "blocks/common-block/",
        },
      ],
    }),
  ],
  publicDir: false,
  resolve: {
    alias: [
      { find: '~', replacement: path.resolve(__dirname) },
      { find: '@/dashboard', replacement: path.resolve(__dirname, 'resources/dashboard') },
      { find: '@/integration', replacement: path.resolve(__dirname, 'resources/integration') },
      { find: '@/packages', replacement: path.resolve(__dirname, 'resources/packages') },
      { find: '@', replacement: path.resolve(__dirname, 'resources') },
    ],
  },
  server: {
    cors: true,

    // BrowserStackLocal
    allowedHosts: true,
    origin: "http://localhost:3000",
    port: 3000,
  },
});
