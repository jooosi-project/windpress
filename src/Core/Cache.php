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

namespace WindPress\WindPress\Core;

use Exception;
use WIND_PRESS;
use WindPress\WindPress\Utils\Cache as UtilsCache;
use WindPress\WindPress\Utils\Common;

/**
 * @since 3.0.0
 */
class Cache
{
    /**
     * @var string
     */
    public const CSS_CACHE_FILE = 'tailwind.css';

    /**
     * @var string
     */
    public const CSS_SOURCEMAP_FILE = 'tailwind.css.map';

    public const THEME_JSON_FILE = 'theme.json';

    public static function get_providers(): array
    {
        /**
         * Register cache providers.
         * Each provider should have `id`, `name`, `description`, and `callback` keys.
         * Providers supporting stable source identities opt in with `source_index` => 1.
         */
        return apply_filters('f!windpress/core/cache:compile.providers', []);
    }

    public static function get_cache_path(string $file_path = ''): string
    {
        return wp_upload_dir()['basedir'] . WIND_PRESS::CACHE_DIR . $file_path;
    }

    public static function get_cache_url(string $file_path = ''): string
    {
        return wp_upload_dir()['baseurl'] . WIND_PRESS::CACHE_DIR . $file_path;
    }

    public static function save_cache(string $payload)
    {
        try {
            Common::save_file($payload, self::get_cache_path(self::CSS_CACHE_FILE));
        } catch (\Throwable $throwable) {
            throw $throwable;
        }

        do_action('a!windpress/core/cache:save_cache.after', $payload);

        UtilsCache::flush_cache_plugin();
    }

    public static function save_sourcemap(string $payload)
    {
        try {
            Common::save_file($payload, self::get_cache_path(self::CSS_SOURCEMAP_FILE));
        } catch (\Throwable $throwable) {
            throw $throwable;
        }

        do_action('a!windpress/core/cache:save_sourcemap.after', $payload);

        UtilsCache::flush_cache_plugin();
    }

    public static function save_theme_json(string $payload)
    {
        try {
            Common::save_file($payload, self::get_cache_path(self::THEME_JSON_FILE));
        } catch (\Throwable $throwable) {
            throw $throwable;
        }

        do_action('a!windpress/core/cache:save_theme_json.after', $payload);

        UtilsCache::flush_cache_plugin();
    }

    public static function fetch_contents($callback, $metadata = [])
    {
        // if class has an "__invoke" method.
        if (is_string($callback) && class_exists($callback) && method_exists($callback, '__invoke')) {
            $callback = new $callback();
        }

        try {
            $result = call_user_func($callback, $metadata);

            if (! is_array($result)) {
                throw new Exception(__('The callback should return an array', 'windpress'));
            }

            $_metadata = array_key_exists('metadata', $result) ? $result['metadata'] : [];

            $_contents = array_key_exists('contents', $result) ? $result['contents'] : $result;
            if (! is_array($_metadata) || ! is_array($_contents)) {
                throw new Exception(__('The provider metadata and contents must be arrays.', 'windpress'));
            }

            $_contents = array_map(static function ($content) {
                if (! is_array($content) || ! array_key_exists('content', $content)) {
                    throw new Exception(__('A scan source is missing its content.', 'windpress'));
                }

                $content_type = $content['type'] ?? null;

                if (is_array($content['content']) || is_object($content['content'])) {
                    $content['content'] = wp_json_encode($content['content']);
                    $content['type'] = 'json';
                } elseif (is_string($content['content']) && $content_type !== 'json') {
                    // Check if the string is already valid JSON
                    $decoded = json_decode($content['content'], true);
                    if (json_last_error() === JSON_ERROR_NONE && ($decoded !== null || $content['content'] === 'null')) {
                        $content['type'] = 'json';
                    }
                }

                if (! is_string($content['content'])) {
                    throw new Exception(__('A scan source could not be encoded as text.', 'windpress'));
                }

                $content['content'] = base64_encode($content['content']);
                return $content;
            }, $_contents);
        } catch (\Throwable $throwable) {
            throw $throwable;
        }

        return [
            'metadata' => $_metadata,
            'contents' => $_contents,
        ];
    }
}
