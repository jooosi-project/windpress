<?php

/**
 * Path utility class.
 *
 * @package EasyDigitalDownloads\Updater
 * @since 1.0.1
 */
namespace EasyDigitalDownloads\Updater\Utilities;

// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
/**
 * Path utility class for managing SDK paths and URLs.
 */
class Path
{
    /**
     * Stores the current SDK directory.
     *
     * @var string
     */
    private static $sdk_dir = '';
    /**
     * Stores the current SDK URL.
     *
     * @var string
     */
    private static $sdk_url = '';
    /**
     * Stores the current SDK version.
     *
     * @var string
     */
    private static $sdk_version = '';
    /**
     * Sets the SDK paths and version based on a file location.
     *
     * @since 1.0.1
     * @param string $file    The __FILE__ constant from the SDK main plugin file.
     * @param string $version The version number.
     * @return void
     */
    public static function set($file, $version = '1.0.0')
    {
        self::$sdk_dir = dirname($file);
        self::$sdk_version = $version;
        // Calculate the URL based on the file path, relative to WP_CONTENT_DIR.
        $relative_path = str_replace(wp_normalize_path(\WP_CONTENT_DIR), '', wp_normalize_path(self::$sdk_dir));
        self::$sdk_url = trailingslashit(content_url($relative_path));
    }
    /**
     * Gets the SDK directory.
     *
     * @since 1.0.1
     * @return string
     */
    public static function get_dir()
    {
        return self::$sdk_dir;
    }
    /**
     * Gets the SDK URL.
     *
     * @since 1.0.1
     * @return string
     */
    public static function get_url()
    {
        return self::$sdk_url;
    }
    /**
     * Gets the SDK version.
     *
     * @since 1.0.1
     * @return string
     */
    public static function get_version()
    {
        return self::$sdk_version;
    }
}
