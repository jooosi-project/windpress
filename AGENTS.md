# AGENTS.md

This file guides agentic coding tools working in this repository.
Keep it updated when project rules change.

## Project Snapshot

- WindPress is a WordPress plugin that brings Tailwind CSS v3/v4 to WordPress without a build step.
- Dashboard stack: Vue 3 + TypeScript + Pinia + Vue Router + Nuxt UI 4.10.0 + Tailwind CSS v4, built with Vite.
- The WordPress dashboard and builder integrations use Vue 3; the dashboard source is maintained as the stable Vue application.
- Backend stack: PHP 7.4+ with PSR-4 autoloading under `WindPress\WindPress`.
- Frontend source, internal packages, integrations, dependency patches, and development fallback assets live in `resources/`; PHP code lives in `src/`, and generated frontend output lives in `assets/dist/`.
- The dev server is already running at `http://localhost:3000` with HMR.
- Follow Nuxt UI rules in `.agents/rules/nuxt-ui.md` when maintaining the dashboard or Vue integrations.
- No Cursor/Copilot rule files were found in this repo.

## File Layout

- `windpress.php` is the plugin entry point and registers hooks.
- `src/Core` holds runtime, cache, and volume implementations.
- `src/Integration/*` contains page builder integrations (Main/Compile/Editor pattern).
- `src/Api` defines REST API endpoints under namespace `windpress/v1`.
- `src/Abilities` implements Abilities API handlers returning arrays or `WP_Error`.
- `resources/dashboard` is the active Vue dashboard application; its Vite entry is `resources/dashboard/main.ts`.
- `resources/packages` holds shared internal packages (Tailwind compiler, core utilities, and workers).
- `resources/packages/*` is a pnpm workspace for private packages; use `workspace:*` for dependencies between the root application and these packages.
- `resources/packages/lz-string` contains the attributed `lz-string` 2.0 UTF-16 implementation and compatibility fixtures.
- `resources/packages/oxide-parser` contains the Rust/WASM Tailwind Oxide wrapper; generated bindings are ignored build artifacts.
- `resources/integration` contains legacy frontend integrations for page builders.
- `resources/patches` contains dependency patches referenced by `pnpm-workspace.yaml`.
- `resources/declarations.d.ts` contains shared frontend module and browser globals.
- `resources/wp-i18n.js` is the development i18n fallback and the source copied into production output.
- `assets/dist/` is generated output; do not edit by hand.
- `licenses/` contains third-party license notices and is retained in release artifacts.

## Imports and Module Boundaries

- Side-effect imports (CSS, globals) come first, then external packages, then local files.
- Use `import type` for type-only imports where possible.
- `@/` maps to `resources/`; `@/dashboard`, `@/packages`, and `@/integration` resolve active frontend source.
- Prefer aliases over deep relative paths.
- Keep `.js` extensions on relative imports when the existing file does so.
- Avoid circular dependencies between stores, composables, and components.
- Keep `window.windpress` access centralized in composables or entry points.
- Prefer named exports for utilities and composables.
- Use single quotes and trailing commas in multiline objects to match existing style.

## Cross-Cutting Style Rules

- Prefer clear, explicit names; match existing naming in the file you touch.
- Use named functions for methods; use arrow functions only for callbacks.
- Keep types next to the code that uses them; prefer `interface` over `type`.
- Avoid hard-coded colors; use Nuxt UI semantic colors and design tokens in the dashboard and integrations.
- Only add comments when they explain non-obvious intent or reasoning.
- Keep frontend source in `resources/`, generated frontend output in `assets/dist/`, and PHP source in `src/`.

## Vue Dashboard Sources and Integrations

- These rules apply to the active Vue dashboard and Vue-based builder integrations.
- Always use `<script setup lang="ts">` with the Composition API.
- Never use the Options API.
- Dashboard and integration code uses `@/dashboard` and `@/integration`; `~/` maps to the repository root.
- Component file names are PascalCase; composables are `useX`.
- Stores use Pinia `defineStore`; exported as `useXStore`, id is lowercase.
- Use `ref`, `reactive`, `computed`, and `watch` for state and derivations.
- Keep API calls in composables/stores; UI components stay mostly declarative.
- Use `@wordpress/i18n` `__()` for user-facing text with `windpress` domain.
- For async actions, prefer `async function` and return `{ success, message }` on success.
- Surface errors with `throw new Error(...)` or with a returned error payload.
- Use Tailwind utility classes; do not author custom CSS unless unavoidable.
- Avoid manual dark-mode classes; use Nuxt UI design tokens (`bg-default`, `text-muted`).
- Use dynamic `import()` for heavy modules (e.g., Monaco editor).

## Vue Dashboard

- The WordPress dashboard entry is `resources/dashboard/main.ts`; preserve the `#windpress-app` mount, localization, metadata, REST API, worker, and WordPress enqueue contracts.
- Build dashboard work in `resources/dashboard/` and keep the Vue application entry and route behavior stable.
- Use Nuxt UI v4 components and semantic design tokens for shared dashboard UI; keep dashboard state and components in Vue.
- Keep API calls in Pinia stores or composables, and keep UI components mostly declarative.
- Run `pnpm build` for the production bundle and `pnpm lint` for focused dashboard validation.

## Internal Packages

- Keep WindPress-owned browser packages under `resources/packages/` with private package manifests and source exports.
- Do not replace workspace dependencies with npm, GitHub, or preview-registry references.
- Do not edit or commit `resources/packages/oxide-parser/pkg/`; regenerate it with `pnpm build:oxide`.
- `pnpm build:oxide` runs through Docker so the unpinned Tailwind Rust dependency and its build scripts do not execute directly on the host.
- The oxide package intentionally omits `Cargo.lock` and a Git revision for `tailwindcss-oxide`; each regeneration follows Tailwind's current default branch and may require compatibility fixes.
- The builder stage bypasses Docker's layer cache so each regeneration resolves the latest upstream source; BuildKit cache mounts reuse Cargo downloads, compiled dependencies, and `wasm-pack` helper binaries.
- `pnpm build` regenerates Oxide before Vite runs and therefore requires Docker. Other development, typecheck, and test commands consume existing local bindings; run `pnpm build:oxide` explicitly when they need regeneration.
- Preserve the Pieroxy MIT notice in `licenses/lz-string-MIT.txt` and its SPDX headers in `resources/packages/lz-string` source files.
- Keep `licenses/` in release artifacts because `resources/` is removed during packaging.
- Run `pnpm test` after changing either private package; the lz-string fixtures protect stored cache compatibility and the oxide test executes the freshly generated WASM.

## Vue Dashboard Template Conventions

- Use Nuxt UI components (`UButton`, `UForm`, `UFormField`) for shared look and feel.
- Prefer `:ui` props for component theming rather than inline style blocks.
- Avoid inline styles except for component-specific CSS variables.
- Keep template logic minimal; move complex logic into `script setup`.
- Use slots consistently per Nuxt UI v4 patterns.
- Use `v-model` for form bindings and keep validation in the store/composable.
- Provide `aria-label` on icon-only buttons or links.

## Nuxt UI v4 Rules (from `.agents/rules/nuxt-ui.md`)

- Always use Nuxt UI v4 component names (e.g., `UDropdownMenu`, `UFormField`).
- Wrap the app with `UApp` to enable modals, toasts, and overlays.
- Use semantic colors: `primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral`.
- Prefer design tokens (`text-muted`, `bg-elevated`, `border-default`) over raw colors.
- Use `items` prop for list-based components; avoid v2 `links`/`options`.
- In item objects use `onClick`, not `click`.
- Overlay components use `v-model:open` and `#content`/`#body`/`#footer` slots.

## Backend (PHP)

- Use `declare(strict_types=1);` at the top of every PHP file.
- Namespace under `WindPress\WindPress`; follow PSR-4 paths in `src/`.
- Format with PSR-12 (ECS Clean Code/Common/PSR-12 sets).
- Classes are StudlyCaps; methods/properties use snake_case (WordPress style).
- Singleton classes implement `get_instance()` with private constructor/clone and throwing `__wakeup()`.
- Use `do_action('a!windpress/...')` and `apply_filters('f!windpress/...')` for hooks.
- Use `__()` for translations and add translator comments for `sprintf` placeholders.
- Escape output with `esc_html`, `esc_attr`, etc. before rendering.
- Keep data validation close to input; fail fast with `WP_Error` or `Exception`.
- Prefer typed properties and explicit return types.

## WordPress Integration Notes

- REST namespace is `windpress/v1` and uses nonce-based auth.
- Abilities API handlers live in `src/Abilities/Abilities/*`.
- Keep action/filter names scoped with the `windpress` prefix.
- Use `WIND_PRESS::TEXT_DOMAIN` for translations when available.
- Avoid direct file writes; use `Core\Volume` or `Utils\Common` helpers.
- Cache helpers live in `src/Core/Cache.php`.
- Use `register_activation_hook` and `register_deactivation_hook` in `Plugin`.

## Error Handling & Validation

- Frontend: throw `Error` from store actions when API calls fail.
- Frontend: avoid silent catches; if you catch, return `{ success: false, message }`.
- Backend: return `WP_Error` from abilities/REST handlers with a code + message.
- Backend: wrap IO and parsing in `try/catch (\Throwable $throwable)`.
- Use `wp_die` only for fatal configuration issues and escape output.
- Log only when needed; avoid noisy console output in production paths.

## Documentation & Research

- Prefer existing docs in-repo before external searches.
- When looking up external docs, try `llms.txt` first as required by repo guidelines.
- Never guess URLs; verify them.
- Keep README references intact unless updating docs intentionally.

## Repo Hygiene Notes

- Do not start the dev server; it is already running with HMR.
- Do not install or update dependencies without using `pnpm install`/`pnpm update`.
- Avoid touching generated files in `assets/dist/`.
- Keep frontend source, integrations, internal packages, dependency patches, and development fallback assets in `resources/`; keep PHP sources in `src/`.
