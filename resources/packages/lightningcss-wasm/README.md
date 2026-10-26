# @windpress/lightningcss-wasm

WindPress's reduced browser build of Lightning CSS 1.33.0.

The package builds the upstream Rust/NAPI source with bundling and AST visitor
features disabled. WindPress uses only the stylesheet transform API. The
async bundler is omitted, so the build does not apply Asyncify.

## Build

Run pnpm build:lightningcss from the repository root. The Docker build fetches
the pinned v1.33.0 source, applies the feature patch, and writes the generated
WASM module to pkg/. Generated files are ignored by Git.

Source maps remain enabled because Tailwind v4 can request them. Tailwind v3
uses the browserslist target conversion helper.

Lightning CSS is distributed under MPL-2.0. The package also uses napi-wasm
under MIT; both notices are retained in the top-level licenses/ directory.
