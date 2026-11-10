# @windpress/oxide-wasi

Build package for Tailwind CSS Oxide's single-threaded browser WASI implementation. WindPress imports
the upstream `Scanner` API directly from this package.

The generated browser loader, declarations, and WASM file are disposable Docker build artifacts.
The Dockerfile builds Tailwind's upstream `@tailwindcss/oxide-wasm32-wasi` package at a pinned
revision and copies its browser entry into `pkg/`.

## Build

From the repository root, run:

    pnpm build:oxide-wasi

The build requires Docker and network access to download the pinned Tailwind source and its build
dependencies. Update TAILWINDCSS_REV in Dockerfile deliberately when moving to another upstream
revision.
