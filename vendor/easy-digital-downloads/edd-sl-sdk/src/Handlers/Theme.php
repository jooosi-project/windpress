<?php

/**
 * Theme handler.
 *
 * @since 1.0.0
 *
 * @package EasyDigitalDownloads\Updater\Handlers
 */
namespace EasyDigitalDownloads\Updater\Handlers;

// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
use EasyDigitalDownloads\Updater\Updaters\Theme as ThemeUpdater;
/**
 * Represents the handler for themes.
 */
class Theme extends \EasyDigitalDownloads\Updater\Handlers\Handler
{
    /**
     * Adds the listeners for the updater.
     *
     * @since 1.0.0
     * @return void
     */
    protected function add_listeners(): void
    {
        add_action('admin_menu', array($this, 'add_menu'));
    }
    /**
     * Adds the menu item.
     *
     * @since 1.0.0
     * @return void
     */
    public function add_menu()
    {
        global $submenu;
        if (empty($submenu['themes.php'])) {
            return;
        }
        $submenu['themes.php'][] = array(
            // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
            sprintf('<span class="edd-sdk__notice__trigger edd-sdk__notice__trigger--ajax" data-product="%s" data-slug="%s">%s</span>', $this->args['item_id'], $this->args['slug'], $this->messenger->get_theme_license_menu_label()),
            'manage_options',
            'edd_sl_sdk_theme_license',
        );
        add_action('admin_footer', array($this, 'license_modal'));
    }
    /**
     * Auto updater
     *
     * @return  void
     */
    public function auto_updater()
    {
        if (!current_user_can('manage_options') && !wp_doing_cron()) {
            return;
        }
        $license_key = $this->get_license_key();
        if (empty($license_key) && !$this->supports_keyless_activation()) {
            return;
        }
        $args = $this->get_default_api_request_args();
        $args['slug'] = $this->args['slug'];
        // Set up the updater.
        new ThemeUpdater($this->api_url, $args, $this->messenger);
    }
    /**
     * Get the license key.
     *
     * @return string
     */
    private function get_license_key()
    {
        if ($this->supports_keyless_activation() || empty($this->license)) {
            return '';
        }
        return $this->license->get_license_key();
    }
    /**
     * Determines if the plugin supports keyless activation.
     *
     * @return bool
     */
    private function supports_keyless_activation()
    {
        return !empty($this->args['keyless']);
    }
    /**
     * Gets the slug for the API request.
     *
     * @since 1.0.0
     * @return string
     */
    protected function get_slug(): string
    {
        return $this->args['id'];
    }
}
