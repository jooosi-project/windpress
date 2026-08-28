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

namespace WindPress\WindPress\Utils;

use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;
use RegexIterator;
use WIND_PRESS;
use WindPress\WindPress\Core\Cache as CoreCache;
use WindPress\WindPress\Core\Runtime as CoreRuntime;
use WindPress\WindPress\Core\Volume as CoreVolume;

/**
 * Cache utility functions for the plugin.
 *
 * @since 3.0.0
 */
class Cache
{
    /**
     * Clear the cache from various cache plugins.
     */
    public static function flush_cache_plugin()
    {
        /**
         * WordPress Object Cache
         * @see https://developer.wordpress.org/reference/classes/wp_object_cache/
         */
        \wp_cache_flush();

        /**
         * WP Rocket
         * @see https://docs.wp-rocket.me/article/92-rocketcleandomain
         */
        if (function_exists('rocket_clean_domain')) {
            \rocket_clean_domain();
        }

        /**
         * WP Super Cache
         * @see https://github.com/Automattic/wp-super-cache/blob/a0872032b1b3fc6847f490eadfabf74c12ad0135/wp-cache-phase2.php#L3013
         */
        if (function_exists('wp_cache_clear_cache')) {
            \wp_cache_clear_cache();
        }

        /**
         * W3 Total Cache
         * @see https://github.com/BoldGrid/w3-total-cache/blob/3a094493064ea60d727b3389dee813639860ef49/w3-total-cache-api.php#L259
         */
        if (function_exists('w3tc_flush_all')) {
            \w3tc_flush_all();
        }

        /**
         * WP Fastest Cache
         * @see https://www.wpfastestcache.com/tutorial/delete-the-cache-by-calling-the-function/
         */
        if (function_exists('wpfc_clear_all_cache')) {
            \wpfc_clear_all_cache(true);
        }

        /**
         * LiteSpeed Cache
         * @see https://docs.litespeedtech.com/lscache/lscwp/api/#purge-all-existing-caches
         */
        do_action('litespeed_purge_all');

        /**
         * SG Optimizer
         * @see https://plugins.trac.wordpress.org/browser/sg-cachepress/trunk/core/Supercacher/Supercacher.php
         * @see https://plugins.trac.wordpress.org/browser/sg-cachepress/trunk/core/File_Cacher/File_Cacher.php
         */
        if (class_exists('\SiteGround_Optimizer\Supercacher\Supercacher')) {
            \SiteGround_Optimizer\Supercacher\Supercacher::purge_cache();
            \SiteGround_Optimizer\File_Cacher\File_Cacher::get_instance()->purge_everything();
        }
    }

    public static function exclude_optimization()
    {
        self::sgoptimizer_exclude();
        self::wprocket_exclude();
    }

    /**
     * SG Optimizer
     * @see https://www.siteground.com/tutorials/wordpress/speed-optimizer/custom-filters/
     */
    private static function sgoptimizer_exclude()
    {
        add_action('wp_print_scripts', function () {
            /**
             * @var \WP_Scripts $wp_scripts
             */
            global $wp_scripts;

            $handles = [];

            /** @var \WP_Scripts $scripts */
            $scripts = clone $wp_scripts;
            $scripts->all_deps($scripts->queue);

            foreach ($scripts->to_do as $handle) {
                // if $handle contains 'windpress' then add to $handles
                if (strpos($handle, 'windpress') !== false) {
                    $handles[] = $handle;
                }
            }

            add_filter('sgo_js_minify_exclude', fn($exclude_list) => array_merge($exclude_list, $handles));
            add_filter('sgo_javascript_combine_exclude', fn($exclude_list) => array_merge($exclude_list, $handles));
            add_filter('sgo_js_async_exclude', fn($exclude_list) => array_merge($exclude_list, $handles));
        }, 19);
    }

    /**
     * WP Rocket
     * 
     * @see https://docs.wp-rocket.me/article/976-exclude-files-from-defer-js#exclude-inline-scripts
     * @see https://github.com/wp-media/wp-rocket-helpers
     */
    private static function wprocket_exclude()
    {
        $wp_root = strval(substr(ABSPATH, 0, -1));

        $cache_dir = CoreCache::get_cache_path();
        $data_dir = CoreVolume::data_dir_path();
        $plugin_asset_dir = dirname(WIND_PRESS::FILE) . '/assets/dist';

        $excluded_folders = [
            $cache_dir,
            $data_dir,
            $plugin_asset_dir,
        ];

        $excluded_files = [];

        $inline_patterns = [
            'windpress',
            substr(CoreRuntime::get_instance()->getVFSHtml(), 45, 7),
        ];

        foreach ($excluded_folders as $folder) {
            if (file_exists($folder)) {
                $allFiles = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($folder));
                $staticFiles = new RegexIterator($allFiles, '/\.(css|js)$/i');

                foreach ($staticFiles as $staticFile) {
                    $file = str_replace($wp_root, '', $staticFile->getPathname());
                    array_push($excluded_files, $file);
                }
            }
        }

        add_filter('rocket_exclude_async_css', function ($exclude_list) use ($excluded_files) {
            $css_files = array_filter($excluded_files, function ($file) {
                return str_ends_with($file, '.css');
            });

            return array_merge($exclude_list, $css_files);
        });

        add_filter('rocket_delay_js_exclusions', function ($exclude_list) use ($excluded_files) {
            $js_files = array_filter($excluded_files, function ($file) {
                return str_ends_with($file, '.js');
            });

            return array_merge($exclude_list, $js_files);
        });

        add_filter('rocket_exclude_defer_js', function ($exclude_list) use ($excluded_files) {
            $js_files = array_filter($excluded_files, function ($file) {
                return str_ends_with($file, '.js');
            });

            return array_merge($exclude_list, $js_files);
        });

        add_filter('rocket_defer_inline_exclusions', function ($exclude_list) use ($inline_patterns) {
            return array_merge($exclude_list, $inline_patterns); 
        });

        add_filter('rocket_excluded_inline_js_content', function ($exclude_list) use ($inline_patterns) {
            return array_merge($exclude_list, $inline_patterns);
        });
    }
}
