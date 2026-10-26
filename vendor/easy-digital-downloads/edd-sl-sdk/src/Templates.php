<?php

/**
 * Templates manager.
 *
 * @package EasyDigitalDownloads\Updater
 * @since 1.0.0
 */
namespace EasyDigitalDownloads\Updater;

// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
use EasyDigitalDownloads\Updater\Utilities\Path;
/**
 * Class Templates
 *
 * @since 1.0.0
 */
class Templates
{
    /**
     * Loads a template.
     *
     * @since 1.0.0
     * @param string $file The template file name, relative to the templates directory, without the extension.
     * @param array  $args Optional; arguments to pass to the template.
     * @return void
     */
    public static function load(string $file, array $args = array())
    {
        $template = self::get_template($file);
        if (!$template) {
            return;
        }
        load_template($template, \false, $args);
    }
    /**
     * Get the templates path.
     *
     * @since 1.0.0
     * @return string
     */
    private static function get_templates_path()
    {
        return apply_filters('edd_sl_sdk_templates_path', trailingslashit(Path::get_dir()) . 'templates/');
    }
    /**
     * Resolves a template name to a file inside the templates directory.
     *
     * @since 1.0.4
     * @param string $file The template file name, relative to the templates directory, without the extension.
     * @return string|false The absolute path to the template, or false if it is not a valid template.
     */
    private static function get_template(string $file)
    {
        // realpath() throws on a null byte, so reject one rather than let it become a fatal error.
        if (\false !== strpos($file, "\x00")) {
            return \false;
        }
        $templates_path = self::get_templates_path();
        $base = realpath($templates_path);
        $template = realpath($templates_path . $file . '.php');
        if (!$base || !$template) {
            return \false;
        }
        return 0 === strpos($template, $base . \DIRECTORY_SEPARATOR) ? $template : \false;
    }
}
