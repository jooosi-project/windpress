<?php

/**
 * Plugin class.
 *
 * @since 1.0.0
 *
 * @package EasyDigitalDownloads\Updater\Updaters
 */
namespace EasyDigitalDownloads\Updater\Updaters;

// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
/**
 * Represents the Plugin class for handling licensing.
 */
class Plugin extends \EasyDigitalDownloads\Updater\Updaters\Updater
{
    /**
     * Check for Updates at the defined API endpoint and modify the update array.
     *
     * This function dives into the update API just when WordPress creates its update array,
     * then adds a custom API call and injects the custom plugin data retrieved from the API.
     * It is reassembled from parts of the native WordPress plugin update code.
     * See wp-includes/update.php line 121 for the original wp_update_plugins() function.
     *
     * @param array $transient_data Update array build by WordPress.
     * @return array Modified update array with custom plugin data.
     */
    public function check_update($transient_data)
    {
        if (!is_object($transient_data)) {
            $transient_data = new \stdClass();
        }
        if (!empty($transient_data->response) && !empty($transient_data->response[$this->get_name()]) && !$this->should_override_wp_check()) {
            return $transient_data;
        }
        $current = $this->get_limited_data();
        if (\false !== $current && is_object($current) && isset($current->new_version)) {
            if (version_compare($this->get_version(), $current->new_version, '<')) {
                $transient_data->response[$this->get_name()] = $current;
            } else {
                // Populating the no_update information is required to support auto-updates in WordPress 5.5.
                $transient_data->no_update[$this->get_name()] = $current;
            }
        }
        $transient_data->last_checked = time();
        $transient_data->checked[$this->get_name()] = $this->get_version();
        return $transient_data;
    }
    /**
     * Updates information on the "View version x.x details" page with custom data.
     *
     * @param mixed   $_data
     * @param string  $_action
     * @param object  $_args
     * @return object $_data
     */
    public function plugins_api_filter($_data, $_action = '', $_args = null)
    {
        if ('plugin_information' !== $_action) {
            return $_data;
        }
        if (!isset($_args->slug) || $_args->slug !== $this->get_slug()) {
            return $_data;
        }
        // Get the transient where we store the api request for this plugin for 3 hours.
        $edd_api_request_transient = $this->get_cached_version_info();
        // If we have no transient-saved value, run the API, set a fresh transient with the API value, and return that value too right now.
        if (empty($edd_api_request_transient)) {
            $api_response = $this->get_version_from_remote();
            // Expires in 3 hours
            $this->set_version_info_cache($api_response);
            if (\false !== $api_response) {
                $_data = $api_response;
            }
        } else {
            $_data = $edd_api_request_transient;
        }
        // Convert sections into an associative array, since we're getting an object, but Core expects an array.
        if (isset($_data->sections) && !is_array($_data->sections)) {
            $_data->sections = $this->convert_object_to_array($_data->sections);
        }
        // Convert banners into an associative array, since we're getting an object, but Core expects an array.
        if (isset($_data->banners) && !is_array($_data->banners)) {
            $_data->banners = $this->convert_object_to_array($_data->banners);
        }
        // Convert icons into an associative array, since we're getting an object, but Core expects an array.
        if (isset($_data->icons) && !is_array($_data->icons)) {
            $_data->icons = $this->convert_object_to_array($_data->icons);
        }
        // Convert contributors into an associative array, since we're getting an object, but Core expects an array.
        if (isset($_data->contributors) && !is_array($_data->contributors)) {
            $_data->contributors = $this->convert_object_to_array($_data->contributors);
        }
        if (!isset($_data->plugin)) {
            $_data->plugin = $this->get_name();
        }
        if (!isset($_data->version) && !empty($_data->new_version)) {
            $_data->version = $_data->new_version;
        }
        return $_data;
    }
    /**
     * Show the update notification on multisite subsites.
     *
     * @param string  $file
     * @param array   $plugin
     */
    public function show_update_notification($file, $plugin)
    {
        // Return early if in the network admin, or if this is not a multisite install.
        if (is_network_admin() || !is_multisite()) {
            return;
        }
        // Allow single site admins to see that an update is available.
        if (!current_user_can('activate_plugins')) {
            return;
        }
        if ($this->get_name() !== $file) {
            return;
        }
        // Do not print any message if update does not exist.
        $update_cache = get_site_transient('update_plugins');
        if (!isset($update_cache->response[$this->get_name()])) {
            if (!is_object($update_cache)) {
                $update_cache = new \stdClass();
            }
            $update_cache->response[$this->get_name()] = $this->get_repo_api_data();
        }
        // Return early if this plugin isn't in the transient->response or if the site is running the current or newer version of the plugin.
        if (empty($update_cache->response[$this->get_name()]) || version_compare($this->get_version(), $update_cache->response[$this->get_name()]->new_version, '>=')) {
            return;
        }
        printf('<tr class="plugin-update-tr %3$s" id="%1$s-update" data-slug="%1$s" data-plugin="%2$s">', esc_attr($this->get_slug()), esc_attr($file), esc_attr(in_array($this->get_name(), $this->get_active_plugins(), \true) ? 'active' : 'inactive'));
        ?>
		<td colspan="3" class="plugin-update colspanchange">
			<div class="update-message notice inline notice-warning notice-alt">
				<p>
					<?php 
        echo esc_html($this->messenger->get_new_version_available_message($plugin['Name']));
        echo wp_kses_post($this->get_message($update_cache, $file));
        do_action("in_plugin_update_message-{$file}", $plugin, $plugin);
        // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores
        ?>
				</p>
			</div>
		</td>
		</tr>
		<?php 
    }
    /**
     * Adds the hooks for the plugin updater.
     *
     * @since 1.0.0
     * @return void
     */
    protected function add_listeners(): void
    {
        add_filter('pre_set_site_transient_update_plugins', array($this, 'check_update'));
        add_filter('plugins_api', array($this, 'plugins_api_filter'), 10, 3);
        add_action('after_plugin_row', array($this, 'show_update_notification'), 10, 2);
    }
    /**
     * Gets the slug for the API request.
     *
     * @since 1.0.0
     * @return string
     */
    protected function get_slug(): string
    {
        if (empty($this->file)) {
            return '';
        }
        return basename(dirname($this->file));
    }
    /**
     * Gets the name for the API request.
     *
     * @since 1.0.0
     * @return string
     */
    protected function get_name(): string
    {
        if (empty($this->file)) {
            return '';
        }
        return plugin_basename($this->file);
    }
    /**
     * Gets the current version information from the remote site.
     *
     * @return stdClass|false
     */
    protected function get_version_from_remote()
    {
        $request = parent::get_version_from_remote();
        if (!$request) {
            return \false;
        }
        if (isset($request->sections)) {
            $request->sections = maybe_unserialize($request->sections);
        }
        if (isset($request->banners)) {
            $request->banners = maybe_unserialize($request->banners);
        }
        if (isset($request->icons)) {
            $request->icons = maybe_unserialize($request->icons);
        }
        if (!empty($request->sections)) {
            foreach ($request->sections as $key => $section) {
                $request->{$key} = (array) $section;
            }
        }
        return $request;
    }
    /**
     * Gets a limited set of data from the API response.
     * This is used for the update_plugins transient.
     *
     * @since 1.0.0
     * @return \stdClass|false
     */
    private function get_limited_data()
    {
        $version_info = $this->get_repo_api_data();
        if (!$version_info) {
            return \false;
        }
        $limited_data = new \stdClass();
        $limited_data->slug = $this->get_slug();
        $limited_data->plugin = $this->get_name();
        $limited_data->url = $version_info->url ?? '';
        $limited_data->package = $version_info->package ?? '';
        $limited_data->icons = $this->convert_object_to_array($version_info->icons);
        $limited_data->banners = $this->convert_object_to_array($version_info->banners);
        $limited_data->new_version = $version_info->new_version ?? '';
        $limited_data->tested = $version_info->tested ?? '';
        $limited_data->requires = $version_info->requires;
        $limited_data->requires_php = $version_info->requires_php;
        return $limited_data;
    }
    /**
     * Get repo API data from store.
     * Save to cache.
     *
     * @return \stdClass
     */
    private function get_repo_api_data()
    {
        $version_info = $this->get_cached_version_info();
        if (\false !== $version_info) {
            return $version_info;
        }
        $version_info = $this->get_version_from_remote();
        if (!$version_info) {
            return \false;
        }
        // This is required for your plugin to support auto-updates in WordPress 5.5.
        $version_info->plugin = $this->get_name();
        $version_info->id = $this->get_name();
        $version_info->tested = $this->get_tested_version($version_info);
        if (!isset($version_info->requires)) {
            $version_info->requires = '';
        }
        if (!isset($version_info->requires_php)) {
            $version_info->requires_php = '';
        }
        $this->set_version_info_cache($version_info);
        return $version_info;
    }
    /**
     * Gets the plugin's tested version.
     *
     * @since 1.0.0
     * @param object $version_info The version info.
     * @return null|string
     */
    private function get_tested_version($version_info)
    {
        // There is no tested version.
        if (empty($version_info->tested)) {
            return null;
        }
        // Strip off extra version data so the result is x.y or x.y.z.
        list($current_wp_version) = explode('-', get_bloginfo('version'));
        // The tested version is greater than or equal to the current WP version, no need to do anything.
        if (version_compare($version_info->tested, $current_wp_version, '>=')) {
            return $version_info->tested;
        }
        $current_version_parts = explode('.', $current_wp_version);
        $tested_parts = explode('.', $version_info->tested);
        // The current WordPress version is x.y.z, so update the tested version to match it.
        if (isset($current_version_parts[2]) && $current_version_parts[0] === $tested_parts[0] && $current_version_parts[1] === $tested_parts[1]) {
            $tested_parts[2] = $current_version_parts[2];
        }
        return implode('.', $tested_parts);
    }
    /**
     * Convert some objects to arrays when injecting data into the update API
     *
     * Some data like sections, banners, and icons are expected to be an associative array, however due to the JSON
     * decoding, they are objects. This method allows us to pass in the object and return an associative array.
     *
     * @since 1.0.0
     * @param stdClass $data The data to convert.
     * @return array
     */
    private function convert_object_to_array($data)
    {
        if (!is_array($data) && !is_object($data)) {
            return array();
        }
        $new_data = array();
        foreach ($data as $key => $value) {
            $new_data[$key] = is_object($value) ? $this->convert_object_to_array($value) : $value;
        }
        return $new_data;
    }
    /**
     * Gets the changelog link.
     *
     * @since 1.0.0
     * @param object $update_cache The update cache.
     * @return string
     */
    private function get_changelog_link($update_cache)
    {
        if (empty($update_cache->response[$this->get_name()]->sections->changelog)) {
            return '';
        }
        return add_query_arg(array('tab' => 'plugin-information', 'plugin' => rawurlencode($this->get_slug()), 'TB_iframe' => 'true', 'width' => 77, 'height' => 911), self_admin_url('network/plugin-install.php'));
    }
    /**
     * Gets the plugins active in a multisite network.
     *
     * @return array
     */
    private function get_active_plugins()
    {
        $active_plugins = (array) get_option('active_plugins');
        $active_network_plugins = (array) get_site_option('active_sitewide_plugins');
        return array_merge($active_plugins, array_keys($active_network_plugins));
    }
    /**
     * Gets the update message.
     *
     * @param object $update_cache The update cache.
     * @param string $file         The file.
     * @return string
     */
    private function get_message($update_cache, $file)
    {
        if (!current_user_can('update_plugins')) {
            return ' ' . esc_html($this->messenger->get_contact_admin_message());
        }
        $changelog_link = $this->get_changelog_link($update_cache);
        if (empty($update_cache->response[$this->get_name()]->package) && !empty($changelog_link)) {
            return ' ' . sprintf('<a target="_blank" class="thickbox open-plugin-details-modal" href="%1$s">%2$s</a>', esc_url($changelog_link), esc_html($this->messenger->get_view_details_link($update_cache->response[$this->get_name()]->new_version)));
        }
        $update_link = add_query_arg(array('action' => 'upgrade-plugin', 'plugin' => rawurlencode($this->get_name())), self_admin_url('update.php'));
        if (!empty($changelog_link)) {
            return ' ' . $this->messenger->get_view_details_or_update_link($update_cache->response[$this->get_name()]->new_version, $changelog_link, $update_link, $file);
        }
        return sprintf(' <a target="_blank" class="update-link" href="%1$s">%2$s</a>', esc_url(wp_nonce_url($update_link, 'upgrade-plugin_' . $file)), esc_html($this->messenger->get_update_now_text()));
    }
}
