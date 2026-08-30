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
namespace WindPress\WindPress;

use EasyDigitalDownloads\Updater\Registry;
use Exception;
use WIND_PRESS;
use WindPress\WindPress\Abilities\Loader as AbilitiesLoader;
use WindPress\WindPress\Admin\AdminPage;
use WindPress\WindPress\Api\Router as ApiRouter;
use WindPress\WindPress\Core\Runtime;
use WindPress\WindPress\Integration\Loader as IntegrationLoader;
use WindPress\WindPress\Licensing\Manager as LicenseManager;
use WindPress\WindPress\Upgrade\UpgradeManager;
use WindPress\WindPress\Utils\Cache as UtilsCache;
use WindPress\WindPress\Utils\Common;
use WindPress\WindPress\Utils\Notice;
use WP_Upgrader;
/**
 * Manage the plugin lifecycle and provides a single point of entry to the plugin.
 *
 * @since 3.0.0
 */
final class Plugin
{
    /**
     * Easy Digital Downloads Software Licensing integration manager.
     * Pro version only.
     *
     * @var LicenseManager|null
     */
    public $plugin_updater = null;
    /**
     * Stores the instance, implementing a Singleton pattern.
     */
    private static self $instance;
    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private function __construct()
    {
    }
    /**
     * Singletons should not be cloneable.
     */
    private function __clone()
    {
    }
    /**
     * Singletons should not be restorable from strings.
     *
     * @throws Exception Cannot unserialize a singleton.
     */
    public function __wakeup()
    {
        throw new Exception('Cannot unserialize a singleton.');
    }
    /**
     * This is the static method that controls the access to the singleton
     * instance. On the first run, it creates a singleton object and places it
     * into the static property. On subsequent runs, it returns the client existing
     * object stored in the static property.
     */
    public static function get_instance(): self
    {
        if (!isset(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    /**
     * Boot the plugin.
     *
     * @link https://codex.wordpress.org/Plugin_API/Action_Reference
     */
    public function boot(): void
    {
        do_action('a!windpress/plugin:boot.start');
        $this->boot_license_sdk();
        // (de)activation hooks.
        register_activation_hook(WIND_PRESS::FILE, fn() => $this->activate_plugin());
        register_deactivation_hook(WIND_PRESS::FILE, fn() => $this->deactivate_plugin());
        // upgrade hooks.
        add_action('upgrader_process_complete', function (WP_Upgrader $wpUpgrader, array $options): void {
            if ($options['action'] === 'update' && $options['type'] === 'plugin') {
                foreach ($options['plugins'] as $plugin) {
                    if ($plugin === plugin_basename(WIND_PRESS::FILE)) {
                        $this->upgrade_plugin();
                    }
                }
            }
        }, 10, 2);
        add_action('plugins_loaded', fn() => $this->plugins_loaded(), 9);
        add_action('init', fn() => $this->init_plugin());
        do_action('a!windpress/plugin:boot.end');
    }
    /**
     * Get the initialized license manager.
     * Pro version only.
     */
    public function maybe_update_plugin(): ?LicenseManager
    {
        return $this->plugin_updater instanceof LicenseManager ? $this->plugin_updater : null;
    }
    public static function is_pro_edition(): bool
    {
        return is_file(self::get_license_sdk_path());
    }
    /**
     * Handle the plugin's activation by (maybe) running database migrations
     * and initializing the plugin configuration.
     */
    private function activate_plugin(): void
    {
        do_action('a!windpress/plugin:activate_plugin.start');
        update_option(WIND_PRESS::WP_OPTION . '_version', WIND_PRESS::VERSION);
        if ($this->plugin_updater instanceof LicenseManager) {
            $this->maybe_embedded_license();
            $this->plugin_updater->clear_cache();
        }
        do_action('a!windpress/plugin:activate_plugin.end');
    }
    /**
     * Handle plugin's deactivation by (maybe) cleaning up after ourselves.
     */
    private function deactivate_plugin(): void
    {
        do_action('a!windpress/plugin:deactivate_plugin.start');
        do_action('a!windpress/plugin:deactivate_plugin.end');
    }
    /**
     * Handle the plugin's upgrade by (maybe) running database migrations.
     */
    private function upgrade_plugin(): void
    {
        do_action('a!windpress/plugin:upgrade_plugin.start');
        UpgradeManager::get_instance()->run();
        do_action('a!windpress/plugin:upgrade_plugin.end');
    }
    /**
     * Initialize the plugin on WordPress' `init` hook.
     */
    private function init_plugin(): void
    {
        do_action('a!windpress/plugin:init_plugin.start');
        // Load translations.
        if (defined('WindPressDeps\WIND_PRESS_LOAD_TEXT_DOMAIN') && constant('WIND_PRESS_LOAD_TEXT_DOMAIN')) {
            load_plugin_textdomain(WIND_PRESS::TEXT_DOMAIN, \false, dirname(plugin_basename(WIND_PRESS::FILE)) . '/languages/');
        }
        new ApiRouter();
        Runtime::get_instance()->init();
        // Instantiate the AdminPage class.
        new AdminPage();
        UtilsCache::exclude_optimization();
        // Initialize Abilities API integration
        AbilitiesLoader::get_instance()->init();
        do_action('a!windpress/plugin:init_plugin.end');
    }
    /**
     * Initialize the plugin on WordPress' `plugins_loaded` hook.
     */
    private function plugins_loaded(): void
    {
        do_action('a!windpress/plugin:plugins_loaded.start');
        IntegrationLoader::get_instance()->register_integrations();
        if (is_admin()) {
            add_action('admin_notices', static fn() => Notice::admin_notices());
            add_filter('plugin_action_links_' . plugin_basename(WIND_PRESS::FILE), fn($links) => $this->plugin_action_links($links));
        }
        do_action('a!windpress/plugin:plugins_loaded.end');
    }
    /**
     * Add plugin action links.
     *
     * @param array $links Plugin action links.
     * @return array Plugin action links.
     *
     * @todo Add settings link when the settings page is implemented.
     */
    private function plugin_action_links(array $links): array
    {
        $base_url = AdminPage::get_page_url();
        array_unshift($links, sprintf('<a href="%s">%s</a>', esc_url(sprintf('%s#/settings', $base_url)), esc_html__('Settings', 'windpress')));
        if (!Common::is_updater_library_available()) {
            array_unshift($links, sprintf('<a href="%s" style="color:#067b34;font-weight:600;" target="_blank">%s</a>', esc_url(Common::plugin_data('PluginURI') . '?utm_source=WordPress&utm_campaign=liteplugin&utm_medium=plugin-action-links&utm_content=Upgrade#pricing'), esc_html__('Upgrade to Pro', 'windpress')));
        }
        return $links;
    }
    /**
     * Register the plugin with EDD's official Software Licensing SDK.
     */
    private function boot_license_sdk(): void
    {
        $sdk_path = self::get_license_sdk_path();
        if (!is_file($sdk_path)) {
            return;
        }
        $this->plugin_updater = new LicenseManager();
        add_action('init', [$this->plugin_updater, 'boot_updater']);
        add_action('edd_sl_sdk_registry', function ($registry): void {
            $this->register_license_integration($registry);
        });
        require_once $sdk_path;
        // Plugin activation can happen after the SDK initialization hooks ran.
        if (did_action('after_setup_theme') && class_exists(Registry::class)) {
            $this->register_license_integration(Registry::instance());
        }
    }
    /**
     * @param mixed $registry
     */
    private function register_license_integration($registry): void
    {
        if (!$registry instanceof Registry) {
            return;
        }
        if (!$registry->offsetExists(LicenseManager::INTEGRATION_ID)) {
            $registry->register(LicenseManager::get_integration_args());
        }
        $handler = $registry->offsetGet(LicenseManager::INTEGRATION_ID);
        if (is_object($handler) && method_exists($handler, 'auto_updater')) {
            // The SDK registry does not pass wp_override or beta through in
            // version 1.0.3, so Manager boots the official updater directly.
            remove_action('init', [$handler, 'auto_updater']);
        }
    }
    private static function get_license_sdk_path(): string
    {
        return dirname(WIND_PRESS::FILE) . '/vendor/easy-digital-downloads/edd-sl-sdk/edd-sl-sdk.php';
    }
    /**
     * Check if the plugin distributed with an embedded license and activate the license.
     * Pro version only.
     */
    private function maybe_embedded_license(): void
    {
        if (!$this->plugin_updater instanceof LicenseManager) {
            return;
        }
        $license_file = dirname(WIND_PRESS::FILE) . '/license-data.php';
        if (!file_exists($license_file)) {
            return;
        }
        require_once $license_file;
        $const_names = [
            'WIND_PRESS_EMBEDDED_LICENSE_KEY_' . WIND_PRESS::EDD_STORE['item_id'],
            'JOOOSI_EMBEDDED_LICENSE_KEY_' . WIND_PRESS::EDD_STORE['item_id'],
            // Preserve the embedded-license constant used by previous releases.
            'ROSUA_EMBEDDED_LICENSE_KEY_' . WIND_PRESS::EDD_STORE['item_id'],
        ];
        $const_name = null;
        foreach ($const_names as $candidate) {
            if (defined($candidate)) {
                $const_name = $candidate;
                break;
            }
        }
        if ($const_name === null) {
            return;
        }
        $license_key = constant($const_name);
        update_option(WIND_PRESS::WP_OPTION . '_license', ['key' => $license_key, 'opt_in_pre_release' => \false]);
        wp_delete_file($license_file);
        // activate the license.
        $this->plugin_updater->activate((string) $license_key);
    }
}
