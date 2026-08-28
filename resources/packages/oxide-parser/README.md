# @windpress/oxide-parser

Internal Rust/WASM wrapper around Tailwind CSS Oxide's candidate extractor.

The package source was absorbed from `wind-press/oxide-parser` version `1.0.42`. WindPress consumes
the TypeScript source directly through the pnpm workspace. Generated WASM bindings are disposable
build artifacts and are excluded from Git.

## Regenerating WASM

From the repository root:

```bash
pnpm build:oxide
```

The build runs inside Docker and exports only the generated bindings into `pkg/`. The package build
context does not contain the rest of the repository or local environment files. The Rust target and
`wasm-pack` toolchain layers are cached. BuildKit cache mounts reuse Cargo downloads, Git data,
compiled dependencies, and `wasm-pack` helper binaries, while the Oxide builder stage itself remains
uncached so Cargo still resolves Tailwind's current default branch on every regeneration.

The root `build` script regenerates the bindings before Vite runs, so release deployment compiles
the current upstream Oxide source before producing the versioned plugin assets. The `dev`,
`typecheck`, `typecheck:packages`, and `test` scripts consume the existing local bindings; maintainers
can run `pnpm build:oxide` explicitly when regeneration is needed.

`tailwindcss-oxide` intentionally follows the default branch of Tailwind CSS without a Git revision
or committed Cargo lockfile. Regeneration therefore adopts the latest upstream implementation and
may require changes here when Tailwind introduces a breaking change.
