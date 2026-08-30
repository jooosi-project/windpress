# Migrating from `vite-for-wp`

`vp-wp` is a fork and rewrite inspired by [`@kucrut/vite-for-wp`](https://github.com/kucrut/vite-for-wp).

If your plugin or theme already uses `vite-for-wp`, the migration is mostly mechanical:

1. replace the JavaScript and Composer package names
2. swap `v4wp()` for `wordpress()`
3. rename a few PHP option keys from kebab-case to snake_case
4. update any runtime filter names

You do not need to rename your source folders. If your project already uses paths like `js/src` and `js/dist`, you can keep them.

## Quick mapping

| `vite-for-wp`                  | `vp-wp`                           | Notes                    |
| ------------------------------ | --------------------------------- | ------------------------ |
| `@kucrut/vite-for-wp`          | `@nabasa/vp-wp`                   | JavaScript package       |
| `kucrut/vite-for-wp`           | `nabasa/vp-wp`                    | Composer package         |
| `v4wp()`                       | `wordpress()`                     | Vite+ plugin             |
| `input`                        | `entry`                           | JavaScript plugin option |
| `wp_scripts()`                 | `wordpressExternals()`            | Externals helper         |
| `wp_scripts({ extraScripts })` | `wordpressExternals({ include })` | Add custom globals       |
| `Kucrut\Vite`                  | `Nabasa\VitePlus`                 | PHP namespace            |
| `css-dependencies`             | `css_dependencies`                | PHP option key           |
| `css-media`                    | `css_media`                       | PHP option key           |
| `css-only`                     | `css_only`                        | PHP option key           |
| `in-footer`                    | `in_footer`                       | PHP option key           |
| `vite_for_wp__*`               | `nabasa_vite_plus/*`              | Runtime filters          |

## 1. Replace dependencies

Install the new packages with your preferred package manager. With `pnpm`, that looks like this:

```sh
pnpm remove vite @kucrut/vite-for-wp
pnpm add -D vite-plus @nabasa/vp-wp

composer remove kucrut/vite-for-wp
composer require nabasa/vp-wp
```

If you previously copied `vite-for-wp.php` into your project instead of using Composer, replace it with `vp-wp.php` from this repository and update your `require` path.

## 2. Update your Vite config

Before:

```js
import { v4wp } from "@kucrut/vite-for-wp";
import { wp_scripts } from "@kucrut/vite-for-wp/plugins";
import react from "@vitejs/plugin-react";

export default {
  plugins: [
    react(),
    v4wp({
      input: {
        app: "js/src/main.jsx",
      },
      outDir: "js/dist",
    }),
    wp_scripts(),
  ],
};
```

After:

```js
import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { wordpress, wordpressExternals } from "@nabasa/vp-wp";

export default defineConfig({
  plugins: [
    react(),
    wordpress({
      entry: {
        app: "js/src/main.jsx",
      },
      outDir: "js/dist",
    }),
    wordpressExternals(),
  ],
});
```

What changed:

- import `defineConfig` from `vite-plus`
- replace `v4wp()` with `wordpress()`
- rename `input` to `entry`
- replace `wp_scripts()` with `wordpressExternals()`
- replace `extraScripts` with `include` if you add custom externals
- use `exclude` when you want to remove a default external

Example externals migration:

```js
wordpressExternals({
  include: {
    "@acme/ui": "AcmeUI",
  },
  exclude: ["lodash"],
});
```

Unlike `vite-for-wp`, `vp-wp` already ships the dependencies needed by `wordpressExternals()`, so you do not need to install `rollup-plugin-external-globals` or `vite-plugin-external` yourself.

## 3. Update package scripts

Switch your scripts from Vite commands to Vite+ commands:

```json
{
  "scripts": {
    "dev": "vp dev",
    "build": "vp build"
  }
}
```

## 4. Update PHP imports and option keys

Before:

```php
<?php

use Kucrut\Vite;

add_action( 'wp_enqueue_scripts', function (): void {
    Vite\enqueue_asset(
        __DIR__ . '/js/dist',
        'js/src/main.jsx',
        [
            'handle' => 'my-plugin-app',
            'dependencies' => [ 'react', 'react-dom' ],
            'css-dependencies' => [ 'wp-components' ],
            'css-media' => 'all',
            'css-only' => false,
            'in-footer' => true,
        ]
    );
} );
```

After:

```php
<?php

use function Nabasa\VitePlus\enqueue_asset;

add_action( 'wp_enqueue_scripts', function (): void {
    enqueue_asset(
        __DIR__ . '/js/dist',
        'js/src/main.jsx',
        [
            'handle' => 'my-plugin-app',
            'dependencies' => [ 'react', 'react-dom' ],
            'css_dependencies' => [ 'wp-components' ],
            'css_media' => 'all',
            'css_only' => false,
            'in_footer' => true,
        ]
    );
} );
```

`register_asset()` and `enqueue_asset()` still exist, but they now live under the `Nabasa\VitePlus` namespace and expect snake_case option keys.

If you were calling lower-level PHP helpers directly, use this mapping:

| `vite-for-wp`                                        | `vp-wp`                                           | Notes                                                    |
| ---------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `Kucrut\Vite\get_manifest()`                         | `Nabasa\VitePlus\get_manifest()`                  | Same role; adds `$scope` and passes `$is_dev` to filters |
| `Kucrut\Vite\filter_script_tag()`                    | `Nabasa\VitePlus\filter_script_tag()`             | Same role; duplicate handle filters are skipped          |
| `Kucrut\Vite\set_script_type_attribute()`            | `Nabasa\VitePlus\set_script_type_attribute()`     | Same role                                                |
| `Kucrut\Vite\generate_development_asset_src()`       | `Nabasa\VitePlus\development_asset_src()`         | Renamed; same role                                       |
| `Kucrut\Vite\register_vite_client_script()`          | `Nabasa\VitePlus\register_vite_client_script()`   | Same role                                                |
| `Kucrut\Vite\inject_react_refresh_preamble_script()` | `Nabasa\VitePlus\inject_react_refresh_preamble()` | Renamed; also supports `reactRefresh`                    |
| `Kucrut\Vite\load_development_asset()`               | `Nabasa\VitePlus\load_development_asset()`        | Same role; adds `$scope` and deduplicates dependencies   |
| `Kucrut\Vite\load_production_asset()`                | `Nabasa\VitePlus\load_production_asset()`         | Same role; adds `$scope` and scoped filters              |
| `Kucrut\Vite\register_stylesheets()`                 | `Nabasa\VitePlus\register_stylesheets()`          | Same role; style handles are hashed and deduplicated     |
| `Kucrut\Vite\parse_options()`                        | `Nabasa\VitePlus\parse_options()`                 | Same role; defaults use snake_case keys                  |
| `Kucrut\Vite\prepare_asset_url()`                    | `Nabasa\VitePlus\prepare_asset_url()`             | Same role                                                |
| `Kucrut\Vite\register_asset()`                       | `Nabasa\VitePlus\register_asset()`                | Same role; adds `$scope` and default handle generation   |
| `Kucrut\Vite\enqueue_asset()`                        | `Nabasa\VitePlus\enqueue_asset()`                 | Same role; adds `$scope` and default handle generation   |

New in `vp-wp`:

- `Nabasa\VitePlus\assets()`
- `Nabasa\VitePlus\asset_url()`
- `Nabasa\VitePlus\filter_value()`
- `Nabasa\VitePlus\normalize_scope()`
- `Nabasa\VitePlus\default_asset_handle()`
- `Nabasa\VitePlus\stylesheet_handle()`
- `Nabasa\VitePlus\join_asset_url()`

## 5. Optional: adopt the `assets()` helper

`vp-wp` adds an `assets()` helper that binds a manifest directory once and lets you reuse it across hooks:

```php
<?php

use function Nabasa\VitePlus\assets;

$vite = assets( __DIR__ . '/js/dist', 'my-plugin' );

add_action( 'wp_enqueue_scripts', function () use ( $vite ): void {
    $vite->enqueue( 'js/src/main.jsx', [
        'handle' => 'my-plugin-app',
        'dependencies' => [ 'react', 'react-dom' ],
        'in_footer' => true,
    ] );
} );
```

The optional second argument is a scope. Scoped helpers still run the shared hooks and also add scope-specific hooks like `nabasa_vite_plus/my-plugin/production_assets`.

## 6. Update runtime filters

If you hooked into `vite-for-wp` filters, rename them like this:

| `vite-for-wp`                     | `vp-wp`                               |
| --------------------------------- | ------------------------------------- |
| `vite_for_wp__manifest_data`      | `nabasa_vite_plus/manifest_data`      |
| `vite_for_wp__development_assets` | `nabasa_vite_plus/development_assets` |
| `vite_for_wp__production_assets`  | `nabasa_vite_plus/production_assets`  |

Notes:

- `nabasa_vite_plus/manifest_data` now also receives `$is_dev` as the last callback argument
- scoped variants are available as `nabasa_vite_plus/{scope}/manifest_data`, `nabasa_vite_plus/{scope}/development_assets`, and `nabasa_vite_plus/{scope}/production_assets`
- generated CSS handles now include a hash suffix, so avoid hardcoding them; if you need exact handles, read the return value from `register_asset()`

## 7. Verify the migration

After updating the config and runtime calls:

```sh
vp dev
vp build
```

Then confirm that:

- `vite-dev-server.json` is written during development
- `manifest.json` is written during builds
- your WordPress page loads the expected entrypoint
- CSS files still load in production
- any custom runtime filters still fire with their updated names
