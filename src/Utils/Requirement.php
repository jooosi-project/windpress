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

use WIND_PRESS;
/**
 * Check plugin requirements.
 *
 * @since 3.0.0
 */
class Requirement
{
    /**
     * @var list<string>
     */
    protected $doesNotMeet = [];
    public function __construct()
    {
        require_once \ABSPATH . 'wp-admin/includes/plugin.php';
    }
    /**
     * Get the status of the requirements check.
     */
    public function met(): bool
    {
        return $this->doesNotMeet === [];
    }
    /**
     * Check if the plugin is running on PHP version greater than or equal to
     * the specified version.
     *
     * @param string $minVersion The minimum PHP version required.
     */
    public function php(string $minVersion): self
    {
        if (version_compare(\PHP_VERSION, $minVersion, '<')) {
            $this->doesNotMeet[] = sprintf('<strong>%s</strong> <code>%s</code> or higher', 'PHP', $minVersion);
        }
        return $this;
    }
    /**
     * Check if the plugin is running on WordPress version greater than or equal to
     * the specified version.
     *
     * @param string $minVersion The minimum WordPress version required.
     */
    public function wp(string $minVersion): self
    {
        if (version_compare(get_bloginfo('version'), $minVersion, '<')) {
            $this->doesNotMeet[] = sprintf('<strong>%s</strong> <code>%s</code> or higher', 'WordPress', $minVersion);
        }
        return $this;
    }
    /**
     * Check if the plugin is running on multisite.
     *
     * @param bool $must Whether the plugin must be running on multisite.
     */
    public function multisite(bool $must): self
    {
        if ($must && !is_multisite()) {
            $this->doesNotMeet[] = 'WordPress Multisite';
        }
        return $this;
    }
    /**
     * Check if plugins are active and may have the minimum version specified.
     *
     * @param list<string|array{0: string, 1: string}> $plugins The plugins to check. Use the plugin file path, e.g. `windpress/windpress.php`.
     */
    public function plugins(array $plugins): self
    {
        foreach ($plugins as $k => $v) {
            if (is_int($k)) {
                if (!is_plugin_active($v)) {
                    $pluginName = get_plugin_data(\WP_PLUGIN_DIR . '/' . $v)['Name'];
                    $this->doesNotMeet[] = sprintf('<strong>%s</strong>', $pluginName);
                }
            } else {
                $pluginName = get_plugin_data(\WP_PLUGIN_DIR . '/' . $k)['Name'];
                if (!is_plugin_active($k)) {
                    $this->doesNotMeet[] = sprintf('<strong>%s</strong>', $pluginName);
                } elseif (version_compare(get_plugin_data(\WP_PLUGIN_DIR . '/' . $k)['Version'], $v, '<')) {
                    $this->doesNotMeet[] = sprintf('<strong>%s</strong> <code>%s</code> or higher', $pluginName, $v);
                }
            }
        }
        return $this;
    }
    /**
     * Check if the site is using the specified theme.
     *
     * @param string $parentTheme The parent theme to check.
     * @param string|null $version The minimum version of the parent theme.
     */
    public function theme(string $parentTheme, ?string $version = null): self
    {
        $theme = wp_get_theme();
        if (get_template() !== $parentTheme) {
            $this->doesNotMeet[] = sprintf('<strong>%s</strong>', $parentTheme);
        } elseif ($version && version_compare(($theme->parent() ?: $theme)->get('Version'), $version, '<')) {
            $this->doesNotMeet[] = sprintf('<strong>%s</strong> <code>%s</code> or higher', $parentTheme, $version);
        }
        return $this;
    }
    public function printNotice()
    {
        $name = esc_html(get_plugin_data(WIND_PRESS::FILE, \false)['Name']);
        if (!current_user_can('activate_plugins')) {
            return;
        }
        $notice = sprintf(
            /* translators: 1: plugin name, 2: list of requirements */
            esc_html__('The %1$s plugin minimum requirements are not met:', 'windpress'),
            '<strong>' . $name . '</strong>'
        );
        $requirements = count($this->doesNotMeet) === 0 ? '' : '<ul><li>' . implode('</li><li>', $this->doesNotMeet) . '</li></ul>';
        printf('<div class="notice notice-error"><p>%1$s</p>%2$s</div>', wp_kses_post($notice), wp_kses_post($requirements));
    }
}
