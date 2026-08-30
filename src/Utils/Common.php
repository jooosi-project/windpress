<?php

/*
 * This file is part of the WindPress package.
 *
 * (c) Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
declare (strict_types=1);
namespace WindPress\WindPress\Utils;

use Exception;
use WIND_PRESS;
use WindPress\WindPress\Plugin;
/**
 * Common utility functions for the plugin.
 *
 * @since 3.0.0
 */
class Common
{
    /**
     * Check the type of the current request.
     *
     * @param string $type The type of the request. Available values: `admin`, `ajax`, `frontend`, `rest`, `cron`.
     */
    public static function is_request(string $type): bool
    {
        switch ($type) {
            case 'admin':
                return is_admin();
            case 'ajax':
                return wp_doing_ajax();
            case 'rest':
                return defined('REST_REQUEST') && \REST_REQUEST;
            case 'cron':
                return wp_doing_cron();
            case 'json':
                return wp_is_json_request();
            case 'xmlrpc':
                return defined('XMLRPC_REQUEST') && \XMLRPC_REQUEST;
            case 'xml':
                return wp_is_xml_request();
            case 'frontend':
                return (!is_admin() || wp_doing_ajax()) && !wp_doing_cron();
            default:
                return \false;
        }
    }
    /**
     * Get the plugin's data.
     *
     * @param string $key The key to retrieve.
     * @return mixed
     */
    public static function plugin_data(?string $key = null)
    {
        if (!function_exists('get_plugin_data')) {
            require_once \ABSPATH . 'wp-admin/includes/plugin.php';
        }
        $plugin_data = wp_cache_get('plugin_data', WIND_PRESS::WP_OPTION);
        if (!$plugin_data) {
            $plugin_data = get_plugin_data(WIND_PRESS::FILE);
            wp_cache_set('plugin_data', $plugin_data, WIND_PRESS::WP_OPTION);
        }
        return $key ? $plugin_data[$key] : $plugin_data;
    }
    public static function is_updater_library_available(): bool
    {
        return Plugin::is_pro_edition();
    }
    public static function random_slug(int $length = 21): string
    {
        return (new \WindPressDeps\Hidehalo\Nanoid\Client())->generateId($length, \WindPressDeps\Hidehalo\Nanoid\Client::MODE_DYNAMIC);
    }
    /**
     * Redirect to the given location. If headers are already sent, use a meta refresh.
     *
     * @param string $location The location to redirect to.
     * @param bool $safe Whether to use wp_safe_redirect() or not.
     */
    public static function redirect(string $location, bool $safe = \false, int $status = 302, string $x_redirect_by = 'WordPress')
    {
        if (!headers_sent()) {
            if ($safe) {
                wp_safe_redirect($location, $status, $x_redirect_by);
            } else {
                wp_redirect($location, $status, $x_redirect_by);
            }
        } else {
            echo '<meta http-equiv="refresh" content="0;url=' . esc_url($location) . '">';
        }
        exit;
    }
    /**
     * Save the worker result into the file.
     *
     * @param mixed $content The content of the file.
     * @param string $file_path The file path.
     * @param int $flags The flags to pass to the file_put_contents() function.
     * @throws Exception
     */
    public static function save_file($content, string $file_path, int $flags = 0): void
    {
        /**
         * @var \WP_Filesystem_Base $wp_filesystem
         */
        global $wp_filesystem;
        if (!file_exists($file_path)) {
            wp_mkdir_p(dirname($file_path));
        }
        if (!$wp_filesystem) {
            require_once \ABSPATH . 'wp-admin/includes/file.php';
            WP_Filesystem();
        }
        $result = $wp_filesystem->put_contents($file_path, $content, $flags);
        if ($result === \false) {
            throw new Exception('Failed to save to file.', 500);
        }
        // if write is successful continue
        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file
        $saved_content = $wp_filesystem->get_contents($file_path);
        // if read is successful continue
        if ($saved_content === \false) {
            throw new Exception('The saved file is not readable.', 500);
        }
    }
    /**
     * Deletes a file or directory.
     *
     * @param string       $file_path Path to the file or directory.
     * @param bool         $recursive Optional. If set to true, deletes files and folders recursively.
     *                                Default false.
     * @param string|false $type      Type of resource. 'f' for file, 'd' for directory.
     *                                Default false.
     */
    public static function delete_file($file_path, $recursive = \false, $type = \false): void
    {
        /**
         * @var \WP_Filesystem_Base $wp_filesystem
         */
        global $wp_filesystem;
        if (!$wp_filesystem) {
            require_once \ABSPATH . 'wp-admin/includes/file.php';
            WP_Filesystem();
        }
        $result = $wp_filesystem->delete($file_path, $recursive, $type);
        if ($result === \false) {
            throw new Exception('Failed to delete the file.', 500);
        }
    }
    /**
     * Get all installed plugins
     * 
     * @return array Array of installed plugins
     */
    public static function get_all_plugins()
    {
        require_once \ABSPATH . 'wp-admin/includes/plugin.php';
        return get_plugins();
    }
    /**
     * Check if a plugin is installed by name or slug
     * Supports wildcard patterns (e.g., "GreenShift*") and regex patterns (e.g., "/^GreenShift/i")
     *
     * @param string|array $plugin_name The name, slug, or array of aliases of the plugin to check. Can be:
     *                                  - Exact match: "GreenShift" or "greenshift/greenshift.php"
     *                                  - Wildcard: "GreenShift*" or "greenshift/*"
     *                                  - Regex: "/^GreenShift/i" or "/^greenshift\//i"
     *                                  - Array: ['GreenShift', 'greenshift/*', '/^GreenShift/i']
     * @return bool True if the plugin is installed, false otherwise
     */
    public static function is_plugin_installed($plugin_name)
    {
        // Handle array input - check if any alias matches
        if (is_array($plugin_name)) {
            foreach ($plugin_name as $alias) {
                if (self::is_plugin_installed($alias)) {
                    return \true;
                }
            }
            return \false;
        }
        $all_plugins = self::get_all_plugins();
        // Check if it's a regex pattern (starts and ends with /)
        $is_regex = preg_match('/^\/.*\/[imsxeADSUXJu]*$/', $plugin_name);
        if ($is_regex) {
            // Use regex pattern directly - check both name and slug
            foreach ($all_plugins as $plugin_path => $plugin_data) {
                if (preg_match($plugin_name, $plugin_data['Name']) || preg_match($plugin_name, $plugin_path)) {
                    return \true;
                }
            }
        } else {
            // Check if contains wildcards (* or ?)
            $has_wildcards = strpos($plugin_name, '*') !== \false || strpos($plugin_name, '?') !== \false;
            if ($has_wildcards) {
                // Convert wildcard pattern to regex
                // First replace wildcards with placeholders, then escape, then convert placeholders to regex
                $pattern = str_replace(['*', '?'], ['__WILDCARD_ASTERISK__', '__WILDCARD_QUESTION__'], $plugin_name);
                $pattern = preg_quote($pattern, '/');
                $pattern = str_replace(['__WILDCARD_ASTERISK__', '__WILDCARD_QUESTION__'], ['.*', '.'], $pattern);
                $pattern = '/^' . $pattern . '$/i';
                foreach ($all_plugins as $plugin_path => $plugin_data) {
                    if (preg_match($pattern, $plugin_data['Name']) || preg_match($pattern, $plugin_path)) {
                        return \true;
                    }
                }
            } else {
                // Exact match - check both name and slug
                foreach ($all_plugins as $plugin_path => $plugin_data) {
                    if ($plugin_data['Name'] == $plugin_name || $plugin_path == $plugin_name) {
                        return \true;
                    }
                }
            }
        }
        return \false;
    }
    /**
     * Check if a plugin is active by name or slug
     * Supports wildcard patterns (e.g., "GreenShift*") and regex patterns (e.g., "/^GreenShift/i")
     *
     * @param string|array $plugin_name The name, slug, or array of aliases of the plugin to check. Can be:
     *                                  - Exact match: "GreenShift" or "greenshift/greenshift.php"
     *                                  - Wildcard: "GreenShift*" or "greenshift/*"
     *                                  - Regex: "/^GreenShift/i" or "/^greenshift\//i"
     *                                  - Array: ['GreenShift', 'greenshift/*', '/^GreenShift/i']
     * @return bool True if the plugin is active, false otherwise
     */
    public static function is_plugin_active_by_name($plugin_name)
    {
        // Handle array input - check if any alias matches
        if (is_array($plugin_name)) {
            foreach ($plugin_name as $alias) {
                if (self::is_plugin_active_by_name($alias)) {
                    return \true;
                }
            }
            return \false;
        }
        $all_plugins = self::get_all_plugins();
        // Check if it's a regex pattern (starts and ends with /)
        $is_regex = preg_match('/^\/.*\/[imsxeADSUXJu]*$/', $plugin_name);
        if ($is_regex) {
            // Use regex pattern directly - check both name and slug
            foreach ($all_plugins as $plugin_path => $plugin_data) {
                if ((preg_match($plugin_name, $plugin_data['Name']) || preg_match($plugin_name, $plugin_path)) && is_plugin_active($plugin_path)) {
                    return \true;
                }
            }
        } else {
            // Check if contains wildcards (* or ?)
            $has_wildcards = strpos($plugin_name, '*') !== \false || strpos($plugin_name, '?') !== \false;
            if ($has_wildcards) {
                // Convert wildcard pattern to regex
                // First replace wildcards with placeholders, then escape, then convert placeholders to regex
                $pattern = str_replace(['*', '?'], ['__WILDCARD_ASTERISK__', '__WILDCARD_QUESTION__'], $plugin_name);
                $pattern = preg_quote($pattern, '/');
                $pattern = str_replace(['__WILDCARD_ASTERISK__', '__WILDCARD_QUESTION__'], ['.*', '.'], $pattern);
                $pattern = '/^' . $pattern . '$/i';
                foreach ($all_plugins as $plugin_path => $plugin_data) {
                    if ((preg_match($pattern, $plugin_data['Name']) || preg_match($pattern, $plugin_path)) && is_plugin_active($plugin_path)) {
                        return \true;
                    }
                }
            } else {
                // Exact match - check both name and slug
                foreach ($all_plugins as $plugin_path => $plugin_data) {
                    if (($plugin_data['Name'] == $plugin_name || $plugin_path == $plugin_name) && is_plugin_active($plugin_path)) {
                        return \true;
                    }
                }
            }
        }
        return \false;
    }
    /**
     * Check if a theme is installed by name
     * 
     * @param string $theme_name The name of the theme to check
     * @return bool True if the theme is installed, false otherwise
     */
    public static function is_theme_installed($theme_name)
    {
        $all_themes = wp_get_themes();
        foreach ($all_themes as $theme) {
            if ($theme->get('Name') == $theme_name) {
                return \true;
            }
        }
        return \false;
    }
    /**
     * Check if a theme is active by name
     * 
     * @param string $theme_name The name of the theme or parent theme to check
     * @return bool True if the theme is active, false otherwise
     */
    public static function is_theme_active_by_name($theme_name)
    {
        $current_theme = wp_get_theme();
        if ($current_theme->get('Name') == $theme_name) {
            return \true;
        }
        if ($current_theme->parent() && $current_theme->parent()->get('Name') == $theme_name) {
            return \true;
        }
        return \false;
    }
}
