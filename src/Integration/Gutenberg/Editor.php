<?php

/*
 * This file is part of the WindPress package.
 *
 * (c) Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

namespace WindPress\WindPress\Integration\Gutenberg;

use Exception;
use WIND_PRESS;
use WindPress\WindPress\Core\Runtime;
use WP_Theme_JSON_Data;
use WindPress\WindPress\Core\Cache as CoreCache;
use WindPress\WindPress\Utils\Config;
use WindPress\WindPress\Utils\Vite;

/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Editor
{
    public function __construct()
    {
        add_action('enqueue_block_editor_assets', fn() => $this->enqueue_block_editor_assets());
        if (Config::get('integration.gutenberg.settings.theme_json', true)) {
            add_filter('wp_theme_json_data_theme', fn($theme_json) => $this->filter_theme_json_data($theme_json, 'theme'), 1_000_001);
            add_filter('wp_theme_json_data_user', fn($theme_json) => $this->filter_theme_json_data($theme_json, 'custom'), 1_000_001);
        }
    }

    public function enqueue_block_editor_assets()
    {
        $screen = get_current_screen();
        if (is_admin() && $screen->is_block_editor()) {
            add_action('admin_head', fn() => $this->admin_head(), 1_000_001);
        }
    }

    public function admin_head()
    {
        Runtime::get_instance()->print_windpress_metadata();
        Runtime::get_instance()->enqueue_play_cdn();

        if (strpos($_SERVER['REQUEST_URI'], 'site-editor.php') !== false) {
            // handle the canvas
            Vite::assets()->enqueue('resources/integration/gutenberg/site-editor.js', [
                'handle' => WIND_PRESS::WP_OPTION . ':integration-gutenberg-site-editor',
                'in_footer' => true,
            ]);
        } else {
            // handle the canvas
            Vite::assets()->enqueue('resources/integration/gutenberg/post-editor.js', [
                'handle' => WIND_PRESS::WP_OPTION . ':integration-gutenberg-post-editor',
                'in_footer' => true,
            ]);
        }

        $handle = WIND_PRESS::WP_OPTION . ':integration-gutenberg-block-editor';

        Vite::assets()->enqueue('resources/integration/gutenberg/block-editor.jsx', [
            'handle' => $handle,
            'in_footer' => true,
            'dependencies' => ['wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-hooks', 'wp-i18n', 'react', 'react-dom', 'react-jsx-runtime'],
        ]);

        // Enqueue Common Block if enabled
        if (Config::get('integration.gutenberg.settings.common_block', true)) {
            Vite::assets()->enqueue('resources/integration/gutenberg/common-block/index.jsx', [
                'handle' => WIND_PRESS::WP_OPTION . ':integration-gutenberg-common-block',
                'in_footer' => true,
                'dependencies' => ['wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-block-editor', 'wp-hooks', 'wp-i18n', 'wp-plugins', 'wp-data', 'react', 'react-dom', 'react-jsx-runtime', $handle],
            ]);
        }

        // Enqueue Generate Cache module if enabled
        if (Config::get('integration.gutenberg.modules.generate_cache', true)) {
            Vite::assets()->enqueue('resources/integration/gutenberg/modules/generate-cache/main.ts', [
                'handle' => WIND_PRESS::WP_OPTION . ':integration-gutenberg-generate-cache',
                'in_footer' => true,
                'dependencies' => ['wp-data', 'wp-preferences', 'wp-components', 'wp-i18n', 'wp-plugins', 'wp-editor', 'wp-element', 'react', 'react-dom', 'react-jsx-runtime', $handle],
            ]);
        }

        wp_add_inline_script($handle, <<<JS
            // add __windpress__disable_playObserver to window if not exists
            if (typeof window.__windpress__disable_playObserver === 'undefined') {
                window.__windpress__disable_playObserver = true;
            }

            document.addEventListener('DOMContentLoaded', function () {
                wp.hooks.addFilter('windpressgutenberg-autocomplete-items-query', 'windpressgutenberg', async (autocompleteItems, text) => {
                    const windpress_suggestions = await window.windpress.module.autocomplete.query(text);

                    return [...windpress_suggestions, ...autocompleteItems];
                });
            });
        JS, 'after');
    }

    /**
     * @see https://make.wordpress.org/core/2022/10/10/filters-for-theme-json-data/
     * @param WP_Theme_JSON_Data $theme_json
     * @return WP_Theme_JSON_Data
     */
    public function filter_theme_json_data($theme_json, string $origin = 'theme') {
        // Only apply if Tailwind v4 is active
        if (Runtime::tailwindcss_version() !== 4) {
            return $theme_json;
        }

        $theme_json_cache_path = CoreCache::get_cache_path(CoreCache::THEME_JSON_FILE);
        
        // Check if WindPress theme.json cache exists
        if (!file_exists($theme_json_cache_path)) {
            return $theme_json;
        }

        // Get WindPress theme.json from cache
        $windpress_theme_json_content = file_get_contents($theme_json_cache_path);
        
        if ($windpress_theme_json_content === false) {
            return $theme_json;
        }

        // Decode the cached theme.json
        $windpress_theme_data = json_decode($windpress_theme_json_content, true);
        
        if (!is_array($windpress_theme_data) || !isset($windpress_theme_data['version'])) {
            return $theme_json;
        }

        try {
            $current_theme_data = $this->normalize_existing_preset_data($theme_json->get_data());
            $prefixed_windpress_theme_data = $this->prefix_windpress_theme_preset_slugs($windpress_theme_data);

            $merged_theme_data = $current_theme_data;

            if ($origin === 'theme') {
                $merged_theme_data = $this->merge_windpress_theme_presets($merged_theme_data, $prefixed_windpress_theme_data, 'theme');
            }

            if ($origin === 'custom') {
                $merged_theme_data = $this->merge_windpress_theme_presets($merged_theme_data, $prefixed_windpress_theme_data, 'theme', true);
            }

            // Return updated theme.json data
            return $theme_json->update_with($merged_theme_data);
            
        } catch (Exception $e) {
            if (WP_DEBUG) {
                error_log('WindPress theme.json integration error: ' . $e->getMessage());
            }
            return $theme_json;
        }
    }

    /**
     * Prefix WindPress preset slugs to avoid collisions with theme/user presets.
     */
    private function prefix_windpress_theme_preset_slugs(array $windpress_data): array
    {
        $preset_paths = [
            ['settings', 'color', 'palette'],
            ['settings', 'typography', 'fontSizes'],
            ['settings', 'typography', 'fontFamilies'],
            ['settings', 'spacing', 'spacingSizes'],
            ['settings', 'border', 'radiusSizes'],
            ['settings', 'shadow', 'presets'],
        ];

        foreach ($preset_paths as $path) {
            $this->prefix_preset_slugs_at_path($windpress_data, $path);
        }

        return $windpress_data;
    }

    private function normalize_existing_preset_data(array $theme_data): array
    {
        $preset_paths = [
            ['settings', 'color', 'palette'],
            ['settings', 'typography', 'fontSizes'],
            ['settings', 'typography', 'fontFamilies'],
            ['settings', 'spacing', 'spacingSizes'],
            ['settings', 'border', 'radiusSizes'],
            ['settings', 'shadow', 'presets'],
        ];

        foreach ($preset_paths as $path) {
            $this->normalize_preset_collection_at_path($theme_data, $path);
        }

        return $theme_data;
    }

    /**
     * Merge WindPress presets into the selected origin while preserving existing presets.
     */
    private function merge_windpress_theme_presets(array $current_data, array $windpress_data, string $origin, bool $only_if_origin_exists = false): array
    {
        $merged_data = $current_data;
        $preset_paths = [
            ['settings', 'color', 'palette'],
            ['settings', 'typography', 'fontSizes'],
            ['settings', 'typography', 'fontFamilies'],
            ['settings', 'spacing', 'spacingSizes'],
            ['settings', 'border', 'radiusSizes'],
            ['settings', 'shadow', 'presets'],
        ];

        foreach ($preset_paths as $path) {
            if ($only_if_origin_exists && !$this->has_origin_preset_list_at_path($merged_data, $path, $origin)) {
                continue;
            }

            $windpress_presets = $this->get_preset_list_at_path($windpress_data, $path);

            if ($windpress_presets === []) {
                continue;
            }

            $current_presets = $this->get_preset_list_at_path($merged_data, $path, $origin);
            $merged_presets = $this->merge_preset_lists($current_presets, $windpress_presets);

            $this->set_preset_list_for_origin($merged_data, $path, $origin, $merged_presets);
        }

        return $merged_data;
    }

    private function has_origin_preset_list_at_path(array $data, array $path, string $origin): bool
    {
        $target = $this->get_array_at_path($data, $path);

        if ($target === null || !$this->is_origin_preset_map($target)) {
            return false;
        }

        return isset($target[$origin]) && is_array($target[$origin]);
    }

    private function prefix_preset_slugs_at_path(array &$data, array $path): void
    {
        $target = &$data;

        foreach ($path as $segment) {
            if (!isset($target[$segment]) || !is_array($target[$segment])) {
                return;
            }

            $target = &$target[$segment];
        }

        if ($this->is_origin_preset_map($target)) {
            foreach ($target as $origin => $origin_presets) {
                if (!is_array($origin_presets)) {
                    continue;
                }

                $normalized_presets = $this->normalize_preset_collection_with_resolved_slugs($origin_presets);
                $this->prefix_preset_slugs($normalized_presets);
                $target[$origin] = $normalized_presets;
            }

            return;
        }

        $normalized_presets = $this->normalize_preset_collection_with_resolved_slugs($target);
        $this->prefix_preset_slugs($normalized_presets);
        $target = $normalized_presets;
    }

    private function normalize_preset_collection_at_path(array &$data, array $path): void
    {
        $target = &$data;

        foreach ($path as $segment) {
            if (!isset($target[$segment]) || !is_array($target[$segment])) {
                return;
            }

            $target = &$target[$segment];
        }

        if ($this->is_origin_preset_map($target)) {
            foreach ($target as $origin => $origin_presets) {
                if (!is_array($origin_presets)) {
                    continue;
                }

                $target[$origin] = $this->normalize_preset_collection_with_resolved_slugs($origin_presets);
            }

            return;
        }

        $target = $this->normalize_preset_collection_with_resolved_slugs($target);
    }

    private function prefix_preset_slugs(array &$presets): void
    {
        foreach ($presets as &$preset) {
            if (!is_array($preset)) {
                continue;
            }

            $slug = $this->resolve_preset_slug($preset);

            if ($slug === null) {
                continue;
            }

            if (strpos($slug, 'windpress-') !== 0) {
                $slug = 'windpress-' . $slug;
            }

            $preset['slug'] = $slug;
        }

        unset($preset);
    }

    private function get_preset_list_at_path(array $data, array $path, ?string $origin = null): array
    {
        $target = $this->get_array_at_path($data, $path);

        if ($target === null) {
            return [];
        }

        if ($origin !== null) {
            if (!isset($target[$origin]) || !is_array($target[$origin])) {
                return [];
            }

            return $this->normalize_preset_collection($target[$origin]);
        }

        if (!$this->is_origin_preset_map($target)) {
            return $this->normalize_preset_collection($target);
        }

        $presets = [];

        foreach ($target as $origin_presets) {
            if (!is_array($origin_presets)) {
                continue;
            }

            foreach ($this->normalize_preset_collection($origin_presets) as $preset) {
                $presets[] = $preset;
            }
        }

        return $presets;
    }

    private function set_preset_list_for_origin(array &$data, array $path, string $origin, array $presets): void
    {
        $target = &$data;

        foreach ($path as $segment) {
            if (!isset($target[$segment]) || !is_array($target[$segment])) {
                $target[$segment] = [];
            }

            $target = &$target[$segment];
        }

        if (!$this->is_origin_preset_map($target)) {
            $target = [$origin => $this->normalize_preset_collection($target)];
        }

        $target[$origin] = $presets;
    }

    private function is_origin_preset_map(array $presets): bool
    {
        $origin_keys = ['default', 'blocks', 'theme', 'custom'];

        foreach ($origin_keys as $origin_key) {
            if (array_key_exists($origin_key, $presets)) {
                return true;
            }
        }

        return false;
    }

    private function normalize_preset_collection(array $presets): array
    {
        if ($this->is_list_array($presets)) {
            return $presets;
        }

        $normalized_presets = [];

        foreach ($presets as $key => $preset) {
            if (!is_array($preset)) {
                continue;
            }

            if ((!isset($preset['slug']) || !is_string($preset['slug']) || trim($preset['slug']) === '') && (is_string($key) || is_int($key))) {
                $preset['slug'] = (string) $key;
            }

            $normalized_presets[] = $preset;
        }

        return $normalized_presets;
    }

    private function normalize_preset_collection_with_resolved_slugs(array $presets): array
    {
        $normalized_presets = [];
        $seen_slugs = [];

        foreach ($this->normalize_preset_collection($presets) as $preset) {
            if (!is_array($preset)) {
                continue;
            }

            $normalized_preset = $this->normalize_preset_for_merge($preset);

            if ($normalized_preset === null) {
                continue;
            }

            $slug = $normalized_preset['slug'];

            if (isset($seen_slugs[$slug])) {
                continue;
            }

            $normalized_presets[] = $normalized_preset;
            $seen_slugs[$slug] = true;
        }

        return $normalized_presets;
    }

    private function merge_preset_lists(array $current_presets, array $windpress_presets): array
    {
        $merged_presets = [];
        $seen_slugs = [];

        foreach ([$current_presets, $windpress_presets] as $preset_group) {
            foreach ($preset_group as $preset) {
                if (!is_array($preset)) {
                    continue;
                }

                $normalized_preset = $this->normalize_preset_for_merge($preset);

                if ($normalized_preset === null) {
                    continue;
                }

                $slug = $normalized_preset['slug'];

                if (isset($seen_slugs[$slug])) {
                    continue;
                }

                $merged_presets[] = $normalized_preset;
                $seen_slugs[$slug] = true;
            }
        }

        return $merged_presets;
    }

    private function normalize_preset_for_merge(array $preset): ?array
    {
        $slug = $this->resolve_preset_slug($preset);

        if ($slug === null) {
            return null;
        }

        $preset['slug'] = $slug;

        return $preset;
    }

    private function resolve_preset_slug(array $preset): ?string
    {
        if (isset($preset['slug']) && is_string($preset['slug'])) {
            $slug = trim($preset['slug']);

            if ($slug !== '') {
                return $slug;
            }
        }

        $fallback_keys = ['name', 'fontFamily', 'size', 'color', 'shadow'];

        foreach ($fallback_keys as $fallback_key) {
            if (!isset($preset[$fallback_key]) || !is_string($preset[$fallback_key])) {
                continue;
            }

            $slug = sanitize_title($preset[$fallback_key]);

            if ($slug !== '') {
                return $slug;
            }
        }

        return null;
    }

    private function get_array_at_path(array $data, array $path): ?array
    {
        $target = $data;

        foreach ($path as $segment) {
            if (!isset($target[$segment]) || !is_array($target[$segment])) {
                return null;
            }

            $target = $target[$segment];
        }

        return $target;
    }

    private function is_list_array(array $array): bool
    {
        $expected_key = 0;

        foreach ($array as $key => $_value) {
            if ($key !== $expected_key) {
                return false;
            }

            $expected_key++;
        }

        return true;
    }
}
