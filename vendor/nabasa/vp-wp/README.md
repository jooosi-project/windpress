# vp-wp

[![build status](https://github.com/nabasa-dev/vp-wp/actions/workflows/ci.yml/badge.svg)](https://github.com/nabasa-dev/vp-wp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40nabasa%2Fvp-wp?logo=npm)](https://www.npmjs.com/package/@nabasa/vp-wp)
[![npm downloads](https://img.shields.io/npm/dm/%40nabasa%2Fvp-wp?logo=npm)](https://www.npmjs.com/package/@nabasa/vp-wp)
[![composer version](https://img.shields.io/packagist/v/nabasa/vp-wp?logo=packagist)](https://packagist.org/packages/nabasa/vp-wp)
[![composer downloads](https://img.shields.io/packagist/dt/nabasa/vp-wp?logo=packagist)](https://packagist.org/packages/nabasa/vp-wp)
[![pkg.pr.new](https://pkg.pr.new/badge/nabasa-dev/vp-wp)](https://pkg.pr.new/~/nabasa-dev/vp-wp)
[![license](https://img.shields.io/github/license/nabasa-dev/vp-wp)](https://github.com/nabasa-dev/vp-wp/blob/main/LICENSE)

`vp-wp` brings a modern Vite+ workflow to WordPress plugins and themes.

Use it to build and serve frontend assets with WordPress-friendly defaults, a compact TypeScript API, and a lightweight PHP runtime.

## Install

Install the JavaScript package with Vite+:

```sh
vp add -D vite-plus @nabasa/vp-wp
```

If you also want the PHP runtime helpers through Composer:

```sh
composer require nabasa/vp-wp
```

If you are not using Composer, copy `vp-wp.php` into your plugin or theme and require it manually.

## Migration

Moving from `@kucrut/vite-for-wp`? See [`docs/migrating-from-vite-for-wp.md`](docs/migrating-from-vite-for-wp.md).

## Vite+ config

A minimal Vite+ config looks like this:

```ts
import { defineConfig } from "vite-plus";
import { wordpress, wordpressExternals } from "@nabasa/vp-wp";

export default defineConfig({
  plugins: [
    wordpress({
      entry: {
        app: "resources/app.ts",
      },
      outDir: "assets/dist",
    }),
    wordpressExternals(),
  ],
});
```

Then run the usual Vite+ commands:

```sh
vp dev
vp build
```

`wordpress()` applies WordPress-friendly defaults:

- `base: './'`
- `build.manifest: 'manifest.json'`
- `build.modulePreload: false`
- `css.devSourcemap: true`
- a development manifest at `vite-dev-server.json`

These defaults keep asset URLs, manifests, and CSS handling aligned with WordPress expectations.

`wordpressExternals()` keeps common WordPress globals out of your bundle and treats React as external by default.

## PHP runtime

A typical enqueue setup looks like this:

```php
<?php

use function Nabasa\VitePlus\assets;

$vite = assets( __DIR__ . '/assets/dist' );

add_action( 'wp_enqueue_scripts', function () use ( $vite ): void {
    $vite->enqueue(
        'resources/app.ts',
        [
            'handle' => 'my-plugin-app',
            'dependencies' => [ 'react', 'react-dom' ],
            'in_footer' => true,
        ]
    );
} );
```

Exposed PHP runtime API:

Supported public API:

- `Nabasa\VitePlus\assets()` creates a reusable `Assets` helper.
- `Nabasa\VitePlus\register_asset()` registers an entry and extracted CSS.
- `Nabasa\VitePlus\enqueue_asset()` registers and enqueues an entry.
- `Nabasa\VitePlus\asset_url()` resolves a public asset URL.
- `Nabasa\VitePlus\Assets::__construct()` creates the helper directly.
- `Nabasa\VitePlus\Assets::manifest_dir()` gets the bound manifest directory.
- `Nabasa\VitePlus\Assets::scope()` gets the normalized scope.
- `Nabasa\VitePlus\Assets::register()` registers an entry.
- `Nabasa\VitePlus\Assets::enqueue()` registers and enqueues an entry.
- `Nabasa\VitePlus\Assets::url()` resolves an asset URL.

Advanced callable helpers:

- `Nabasa\VitePlus\filter_value()` applies shared and scoped filters.
- `Nabasa\VitePlus\normalize_scope()` sanitizes a hook scope.
- `Nabasa\VitePlus\get_manifest()` loads and caches manifest data.
- `Nabasa\VitePlus\parse_options()` merges options with defaults.
- `Nabasa\VitePlus\default_asset_handle()` generates a default handle.
- `Nabasa\VitePlus\stylesheet_handle()` generates a deterministic style handle.
- `Nabasa\VitePlus\prepare_asset_url()` builds a manifest base URL.
- `Nabasa\VitePlus\join_asset_url()` joins a base URL and asset path.

Internal and compatibility helpers:

- `Nabasa\VitePlus\load_development_asset()`
- `Nabasa\VitePlus\load_production_asset()`
- `Nabasa\VitePlus\register_stylesheets()`
- `Nabasa\VitePlus\register_vite_client_script()`
- `Nabasa\VitePlus\inject_react_refresh_preamble()`
- `Nabasa\VitePlus\development_asset_src()`
- `Nabasa\VitePlus\filter_script_tag()`
- `Nabasa\VitePlus\set_script_type_attribute()`
- `Nabasa\VitePlus\should_inject_react_refresh()`
- `Nabasa\VitePlus\string_ends_with()`

Core PHP filters:

- `nabasa_vite_plus/manifest_data`
- `nabasa_vite_plus/development_assets`
- `nabasa_vite_plus/production_assets`
- `nabasa_vite_plus/{scope}/manifest_data`
- `nabasa_vite_plus/{scope}/development_assets`
- `nabasa_vite_plus/{scope}/production_assets`

Use `assets()` when you want to bind a manifest directory once and reuse it across hooks or callbacks:

```php
<?php

use function Nabasa\VitePlus\assets;

$vite = assets( __DIR__ . '/assets/dist' );

add_action( 'wp_enqueue_scripts', function () use ( $vite ): void {
    $vite->enqueue( 'resources/app.ts', [
        'handle' => 'theme-app',
    ] );
} );
```

Pass a second argument to `assets()` when you want a plugin- or theme-specific hook namespace:

```php
<?php

use function Nabasa\VitePlus\assets;

$vite = assets( __DIR__ . '/assets/dist', 'windpress' );

add_filter( 'nabasa_vite_plus/windpress/production_assets', function ( array $assets ) {
    return $assets;
} );
```

Scoped helpers still trigger the shared `nabasa_vite_plus/*` hooks as well as the scoped `nabasa_vite_plus/{scope}/*` hooks. The scope is normalized with `sanitize_key()`.

If you prefer standalone functions, `register_asset()` and `enqueue_asset()` accept the same scope as a fourth argument.

Supported PHP options include:

- `handle`
- `dependencies`
- `css_dependencies`
- `css_media`
- `css_only`
- `in_footer`

During `vp dev`, `vp-wp` reads `vite-dev-server.json` and serves assets from the active dev server. During `vp build`, it reads `manifest.json` and registers the compiled JavaScript and extracted CSS assets.

Use `asset_url()` when you need the public URL for a file in the built assets directory without looking it up in the manifest:

```php
<?php

use function Nabasa\VitePlus\asset_url;

$logo_url = asset_url( __DIR__ . '/assets/dist', 'images/logo.svg' );
```

## Externals presets

Pick a preset when you want tighter control over which globals stay external:

```ts
wordpressExternals({ preset: "wordpress" });
```

Built-in presets:

- `wordpress`
- `wordpress+react`

You can also extend or trim the externals map to fit your project:

```ts
wordpressExternals({
  include: {
    "@acme/ui": "AcmeUI",
  },
  exclude: ["lodash"],
});
```

## Development

```sh
vp install
vp check
vp test
vp pack
```

## Credits

`vp-wp` is a fork and rewrite inspired by [`@kucrut/vite-for-wp`](https://github.com/kucrut/vite-for-wp).

## Examples

Need a working reference? See [`examples/README.md`](examples/README.md) for React, Vue, Svelte, SolidJS, and vanilla JavaScript. Each example includes the full plugin structure, Vite config, PHP bootstrap, and frontend entry for its framework.
