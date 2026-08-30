<?php

declare (strict_types=1);
namespace WindPressDeps\Nabasa\VitePlus;

use Exception;
use WP_HTML_Tag_Processor;
const DEV_MANIFEST_FILE = 'vite-dev-server.json';
const VITE_CLIENT_HANDLE = 'vp-wp-client';
/**
 * Reusable asset helper bound to a single manifest directory.
 */
final class Assets
{
    private string $manifest_dir;
    private string $scope;
    /**
     * @param string $manifest_dir Absolute path to the directory that contains `manifest.json`
     *                             and `vite-dev-server.json`.
     * @param string $scope Optional hook scope. Scoped hooks are normalized with `sanitize_key()`.
     */
    public function __construct(string $manifest_dir, string $scope = '')
    {
        $this->manifest_dir = $manifest_dir;
        $this->scope = normalize_scope($scope);
    }
    /**
     * @return string Absolute path to the bound manifest directory.
     */
    public function manifest_dir(): string
    {
        return $this->manifest_dir;
    }
    /**
     * @return string Normalized hook scope for this asset helper.
     */
    public function scope(): string
    {
        return $this->scope;
    }
    /**
     * Register a Vite entry and its extracted CSS files.
     *
     * @param string $entry Manifest entry key, such as `resources/app.ts`.
     * @param array{
     *   handle?: string,
     *   dependencies?: list<string>,
     *   css_dependencies?: list<string>,
     *   css_media?: string,
     *   css_only?: bool,
     *   in_footer?: bool
     * } $options Asset registration options.
     * @return array{
     *   scripts: list<string>,
     *   styles: list<string>
     * }|null Registered WordPress handles or `null` when registration fails.
     */
    public function register(string $entry, array $options = []): ?array
    {
        return register_asset($this->manifest_dir, $entry, $options, $this->scope);
    }
    /**
     * Register and immediately enqueue a Vite entry.
     *
     * @param string $entry Manifest entry key, such as `resources/app.ts`.
     * @param array{
     *   handle?: string,
     *   dependencies?: list<string>,
     *   css_dependencies?: list<string>,
     *   css_media?: string,
     *   css_only?: bool,
     *   in_footer?: bool
     * } $options Asset enqueue options.
     * @return bool True when at least the registration flow succeeds, otherwise false.
     */
    public function enqueue(string $entry, array $options = []): bool
    {
        return enqueue_asset($this->manifest_dir, $entry, $options, $this->scope);
    }
    /**
     * Resolve the public URL for a file inside the bound manifest directory.
     *
     * @param string $asset Relative asset path inside the manifest directory.
     * @return string Public asset URL.
     */
    public function url(string $asset = ''): string
    {
        return asset_url($this->manifest_dir, $asset);
    }
}
/**
 * Create a reusable asset helper for a manifest directory.
 *
 * @param string $manifest_dir Absolute path to the directory that contains `manifest.json`
 *                             and `vite-dev-server.json`.
 * @param string $scope Optional hook scope. Scoped hooks are normalized with `sanitize_key()`.
 */
function assets(string $manifest_dir, string $scope = ''): Assets
{
    return new Assets($manifest_dir, $scope);
}
/**
 * Register and enqueue a Vite entry from a manifest directory.
 *
 * @param string $manifest_dir Absolute path to the directory that contains `manifest.json`
 *                             and `vite-dev-server.json`.
 * @param string $entry Manifest entry key, such as `resources/app.ts`.
 * @param array{
 *   handle?: string,
 *   dependencies?: list<string>,
 *   css_dependencies?: list<string>,
 *   css_media?: string,
 *   css_only?: bool,
 *   in_footer?: bool
 * } $options Asset enqueue options.
 * @param string $scope Optional hook scope. Scoped hooks are normalized with `sanitize_key()`.
 * @return bool True when the asset flow succeeds, otherwise false.
 */
function enqueue_asset(string $manifest_dir, string $entry, array $options = [], string $scope = ''): bool
{
    $assets = register_asset($manifest_dir, $entry, $options, $scope);
    if (null === $assets) {
        return \false;
    }
    $callbacks = ['scripts' => 'wp_enqueue_script', 'styles' => 'wp_enqueue_style'];
    foreach ($assets as $group => $handles) {
        $callback = $callbacks[$group];
        foreach ($handles as $handle) {
            $callback($handle);
        }
    }
    return \true;
}
/**
 * Register a Vite entry and its related assets from a manifest directory.
 *
 * @param string $manifest_dir Absolute path to the directory that contains `manifest.json`
 *                             and `vite-dev-server.json`.
 * @param string $entry Manifest entry key, such as `resources/app.ts`.
 * @param array{
 *   handle?: string,
 *   dependencies?: list<string>,
 *   css_dependencies?: list<string>,
 *   css_media?: string,
 *   css_only?: bool,
 *   in_footer?: bool
 * } $options Asset registration options.
 * @param string $scope Optional hook scope. Scoped hooks are normalized with `sanitize_key()`.
 * @return array{
 *   scripts: list<string>,
 *   styles: list<string>
 * }|null Registered WordPress handles or `null` when registration fails.
 */
function register_asset(string $manifest_dir, string $entry, array $options = [], string $scope = ''): ?array
{
    $scope = normalize_scope($scope);
    try {
        $manifest = get_manifest($manifest_dir, $scope);
    } catch (Exception $exception) {
        if (defined('WP_DEBUG') && \WP_DEBUG) {
            wp_die(esc_html($exception->getMessage()));
        }
        return null;
    }
    $options = parse_options($options);
    if ('' === $options['handle']) {
        $options['handle'] = default_asset_handle($entry);
    }
    return $manifest->is_dev ? load_development_asset($manifest, $entry, $options, $scope) : load_production_asset($manifest, $entry, $options, $scope);
}
/**
 * Load and cache the first available manifest for a directory.
 *
 * Prefers the Vite development manifest when present, then falls back to the
 * production `manifest.json` file.
 *
 * @param string $manifest_dir Absolute path to the directory that contains manifest files.
 * @param string $scope Optional hook scope. Scoped hooks are normalized with `sanitize_key()`.
 * @return object{
 *   data: object,
 *   dir: string,
 *   is_dev: bool
 * } Decoded manifest data with directory metadata.
 * @throws Exception When no readable manifest exists or the manifest cannot be decoded.
 */
function get_manifest(string $manifest_dir, string $scope = ''): object
{
    static $manifests = [];
    $manifest_paths = ["{$manifest_dir}/" . DEV_MANIFEST_FILE, "{$manifest_dir}/manifest.json"];
    foreach ($manifest_paths as $manifest_path) {
        if (isset($manifests[$manifest_path])) {
            return $manifests[$manifest_path];
        }
        if (is_file($manifest_path) && is_readable($manifest_path)) {
            $is_dev = string_ends_with($manifest_path, DEV_MANIFEST_FILE);
            break;
        }
    }
    if (!isset($manifest_path, $is_dev)) {
        throw new Exception(sprintf('[vp-wp] No manifest found in %s.', $manifest_dir));
    }
    $manifest = wp_json_file_decode($manifest_path, ['associative' => \false]);
    if (!$manifest) {
        throw new Exception(sprintf('[vp-wp] Failed to read manifest file %s.', $manifest_path));
    }
    $manifest = filter_value('manifest_data', $manifest, $scope, $manifest_dir, $manifest_path, $is_dev);
    $manifests[$manifest_path] = (object) ['data' => $manifest, 'dir' => $manifest_dir, 'is_dev' => $is_dev];
    return $manifests[$manifest_path];
}
function load_development_asset(object $manifest, string $entry, array $options, string $scope = ''): ?array
{
    register_vite_client_script($manifest);
    inject_react_refresh_preamble($manifest);
    $dependencies = array_values(array_unique(array_merge([VITE_CLIENT_HANDLE], $options['dependencies'])));
    $src = development_asset_src($manifest, $entry);
    filter_script_tag($options['handle']);
    if (!wp_register_script($options['handle'], $src, $dependencies, null, $options['in_footer'])) {
        return null;
    }
    $assets = ['scripts' => [$options['handle']], 'styles' => $options['css_dependencies']];
    return filter_value('development_assets', $assets, $scope, $manifest, $entry, $options);
}
function load_production_asset(object $manifest, string $entry, array $options, string $scope = ''): ?array
{
    if (!isset($manifest->data->{$entry})) {
        if (defined('WP_DEBUG') && \WP_DEBUG) {
            wp_die(esc_html(sprintf('[vp-wp] Entry %s not found.', $entry)));
        }
        return null;
    }
    $item = $manifest->data->{$entry};
    $url = asset_url($manifest->dir);
    $assets = ['scripts' => [], 'styles' => []];
    if (!$options['css_only']) {
        filter_script_tag($options['handle']);
        if (wp_register_script($options['handle'], join_asset_url($url, $item->file), $options['dependencies'], null, $options['in_footer'])) {
            $assets['scripts'][] = $options['handle'];
        }
    }
    if (!empty($item->imports)) {
        $register_imports = static function (array $imports) use (&$register_imports, &$assets, $manifest, $options, $url): void {
            foreach ($imports as $import) {
                $import_item = $manifest->data->{$import};
                if (!empty($import_item->imports)) {
                    $register_imports($import_item->imports);
                }
                if (!empty($import_item->css)) {
                    register_stylesheets($assets, $import_item->css, $url, $options);
                }
            }
        };
        $register_imports($item->imports);
    }
    if (!empty($item->css)) {
        register_stylesheets($assets, $item->css, $url, $options);
    }
    return filter_value('production_assets', $assets, $scope, $manifest, $entry, $options);
}
/**
 * Merge asset registration options with package defaults.
 *
 * @param array{
 *   handle?: string,
 *   dependencies?: list<string>,
 *   css_dependencies?: list<string>,
 *   css_media?: string,
 *   css_only?: bool,
 *   in_footer?: bool
 * } $options Partial asset options.
 * @return array{
 *   handle: string,
 *   dependencies: list<string>,
 *   css_dependencies: list<string>,
 *   css_media: string,
 *   css_only: bool,
 *   in_footer: bool
 * } Normalized asset options.
 */
function parse_options(array $options): array
{
    return wp_parse_args($options, ['css_dependencies' => [], 'css_media' => 'all', 'css_only' => \false, 'dependencies' => [], 'handle' => '', 'in_footer' => \false]);
}
/**
 * Generate a default WordPress handle from a manifest entry.
 *
 * @param string $entry Manifest entry key, such as `resources/app.ts`.
 * @return string Sanitized lowercase handle.
 */
function default_asset_handle(string $entry): string
{
    return strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', pathinfo($entry, \PATHINFO_FILENAME)), '-'));
}
function register_stylesheets(array &$assets, array $stylesheets, string $url, array $options): void
{
    foreach ($stylesheets as $stylesheet) {
        $style_handle = stylesheet_handle($options['handle'], $stylesheet);
        if (in_array($style_handle, $assets['styles'], \true)) {
            continue;
        }
        if (wp_register_style($style_handle, join_asset_url($url, $stylesheet), $options['css_dependencies'], null, $options['css_media'])) {
            $assets['styles'][] = $style_handle;
        }
    }
}
/**
 * Generate a deterministic stylesheet handle for a built CSS asset.
 *
 * @param string $handle Base script or entry handle.
 * @param string $stylesheet Relative stylesheet path from the manifest.
 * @return string Stable stylesheet handle.
 */
function stylesheet_handle(string $handle, string $stylesheet): string
{
    $normalized_stylesheet = trim(wp_normalize_path($stylesheet), '/');
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', pathinfo($normalized_stylesheet, \PATHINFO_FILENAME)), '-'));
    $hash = substr(md5($normalized_stylesheet), 0, 8);
    return "{$handle}-{$slug}-{$hash}";
}
function register_vite_client_script(object $manifest): void
{
    if (wp_script_is(VITE_CLIENT_HANDLE, 'registered')) {
        return;
    }
    $src = development_asset_src($manifest, '@vite/client');
    wp_register_script(VITE_CLIENT_HANDLE, $src, [], null, \false);
    filter_script_tag(VITE_CLIENT_HANDLE);
}
function inject_react_refresh_preamble(object $manifest): void
{
    static $did_print_preamble = \false;
    if ($did_print_preamble || !should_inject_react_refresh($manifest->data)) {
        return;
    }
    $script = <<<JS
import RefreshRuntime from "{$manifest->data->origin}/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.\$RefreshReg\$ = () => {};
window.\$RefreshSig\$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
JS;
    wp_add_inline_script(VITE_CLIENT_HANDLE, $script, 'after');
    add_filter('wp_inline_script_attributes', static function (array $attributes): array {
        if (isset($attributes['id']) && VITE_CLIENT_HANDLE . '-js-after' === $attributes['id']) {
            $attributes['type'] = 'module';
        }
        return $attributes;
    });
    $did_print_preamble = \true;
}
function development_asset_src(object $manifest, string $entry): string
{
    $base = trim(preg_replace('/[\/]{2,}/', '/', "{$manifest->data->base}/{$entry}"), '/');
    return sprintf('%s/%s', untrailingslashit($manifest->data->origin), $base);
}
function filter_script_tag(string $handle): void
{
    static $filtered_handles = [];
    if (isset($filtered_handles[$handle])) {
        return;
    }
    add_filter('script_loader_tag', static fn(...$args) => set_script_type_attribute($handle, ...$args), 10, 3);
    $filtered_handles[$handle] = \true;
}
function set_script_type_attribute(string $target_handle, string $tag, string $handle, string $src): string
{
    if ($target_handle !== $handle) {
        return $tag;
    }
    $processor = new WP_HTML_Tag_Processor($tag);
    while ($processor->next_tag('script')) {
        if ($processor->get_attribute('src') === $src) {
            $processor->set_attribute('type', 'module');
            break;
        }
    }
    return $processor->get_updated_html();
}
/**
 * Build a public base URL for assets inside a manifest directory.
 *
 * The resulting URL is normalized so it works for assets located inside plugin
 * or theme directories under `wp-content`.
 *
 * @param string $dir Absolute path to the manifest directory.
 * @return string Public base URL for the manifest directory.
 */
function prepare_asset_url(string $dir): string
{
    $content_dir = wp_normalize_path(\WP_CONTENT_DIR);
    $manifest_dir = wp_normalize_path($dir);
    $url = content_url(str_replace($content_dir, '', $manifest_dir));
    $url_matches_pattern = preg_match('/(?<address>http(?:s?):\/\/.*\/)(?<fullPath>wp-content(?<removablePath>\/.*)\/(?:plugins|themes)\/.*)/', $url, $url_parts);
    if (0 === $url_matches_pattern) {
        return $url;
    }
    ['address' => $address, 'fullPath' => $full_path, 'removablePath' => $removable_path] = $url_parts;
    return sprintf('%s%s', $address, str_replace($removable_path, '', $full_path));
}
/**
 * Apply both global and optional scoped filters for the runtime.
 *
 * @param string $hook Hook suffix, such as `manifest_data`.
 * @param mixed $value Filtered value.
 * @param string $scope Normalized hook scope.
 * @param mixed ...$args Additional filter arguments.
 * @return mixed Filtered value.
 */
function filter_value(string $hook, $value, string $scope = '', ...$args)
{
    $value = apply_filters("nabasa_vite_plus/{$hook}", $value, ...$args);
    if ('' === $scope) {
        return $value;
    }
    return apply_filters("nabasa_vite_plus/{$scope}/{$hook}", $value, ...$args);
}
/**
 * Normalize a hook scope so it is safe to use in dynamic hook names.
 *
 * @param string $scope Raw hook scope.
 * @return string Normalized scope.
 */
function normalize_scope(string $scope): string
{
    return sanitize_key($scope);
}
function should_inject_react_refresh(object $manifest_data): bool
{
    if (!empty($manifest_data->reactRefresh)) {
        return \true;
    }
    return isset($manifest_data->plugins) && is_array($manifest_data->plugins) && in_array('vite:react-refresh', $manifest_data->plugins, \true);
}
function string_ends_with(string $value, string $suffix): bool
{
    if ('' === $suffix) {
        return \true;
    }
    return substr($value, -strlen($suffix)) === $suffix;
}
/**
 * Resolve the public URL for a file inside a manifest directory.
 *
 * @param string $manifest_dir Absolute path to the directory that contains built assets.
 * @param string $asset Relative asset path inside the manifest directory.
 * @return string Public asset URL.
 */
function asset_url(string $manifest_dir, string $asset = ''): string
{
    $base_url = prepare_asset_url($manifest_dir);
    if ('' === $asset) {
        return $base_url;
    }
    return join_asset_url($base_url, $asset);
}
/**
 * Join a base asset URL with a relative asset path.
 *
 * @param string $base_url Base public URL.
 * @param string $asset Relative asset path.
 * @return string Combined asset URL.
 */
function join_asset_url(string $base_url, string $asset): string
{
    return sprintf('%s/%s', untrailingslashit($base_url), ltrim($asset, '/'));
}
