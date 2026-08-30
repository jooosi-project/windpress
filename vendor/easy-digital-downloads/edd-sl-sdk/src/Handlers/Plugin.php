<?php

/**
 * Plugin handler.
 *
 * @since 1.0.0
 *
 * @package EasyDigitalDownloads\Updater\Handlers
 */
namespace EasyDigitalDownloads\Updater\Handlers;

// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
use EasyDigitalDownloads\Updater\Updaters\Plugin as PluginUpdater;
// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
/**
 * Represents the handler for plugins.
 */
class Plugin extends \EasyDigitalDownloads\Updater\Handlers\Handler
{
    /**
     * Adds the listeners for the updater.
     *
     * @since 1.0.0
     * @return void
     */
    protected function add_listeners(): void
    {
        $plugin_basename = plugin_basename($this->args['file']);
        add_filter("plugin_action_links_{$plugin_basename}", array($this, 'plugin_links'), 100, 3);
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
        $args = wp_parse_args(array('file' => $this->args['file']), $this->get_default_api_request_args());
        // Set up the updater.
        new PluginUpdater($this->api_url, $args, $this->messenger);
    }
    /**
     * Adds the activation link to the plugin list.
     *
     * @since 1.0.0
     * @param array  $actions     The plugin actions.
     * @param string $plugin_file The plugin file.
     * @param array  $plugin_data The plugin data.
     * @return array
     */
    public function plugin_links($actions, $plugin_file, $plugin_data)
    {
        if (!empty($this->args['keyless'])) {
            return $actions;
        }
        $actions['edd_sdk_manage'] = sprintf('<button type="button" class="button-link edd-sdk__notice__trigger edd-sdk__notice__trigger--ajax" data-id="license-control" data-product="%1$s" data-slug="%2$s" data-name="%4$s">%3$s</button>', $this->args['item_id'], $this->args['slug'], $this->messenger->get_manage_license_link_label(), $plugin_data['Name']);
        add_action('admin_footer', array($this, 'license_modal'));
        return $actions;
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
        if (empty($this->args['file'])) {
            return '';
        }
        if (!$this->slug) {
            $this->slug = basename(dirname($this->args['file']));
        }
        return $this->slug;
    }
}
