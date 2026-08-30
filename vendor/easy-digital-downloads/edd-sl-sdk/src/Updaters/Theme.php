<?php

/**
 * Theme updater class.
 *
 * @package EasyDigitalDownloads\Updater\Updaters
 */
namespace EasyDigitalDownloads\Updater\Updaters;

// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
/**
 * Represents the Theme class for handling licensing.
 */
class Theme extends \EasyDigitalDownloads\Updater\Updaters\Updater
{
    /**
     * Check for Updates at the defined API endpoint and modify the update array.
     *
     * This function dives into the update API just when WordPress creates its update array,
     * then adds a custom API call and injects the custom theme data retrieved from the API.
     * It is reassembled from parts of the native WordPress theme update code.
     * See wp-includes/update.php for the original wp_update_themes() function.
     *
     * @param array $transient_data Update array build by WordPress.
     * @return array Modified update array with custom theme data.
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
        if (\false !== $current && isset($current['new_version'])) {
            if (version_compare($this->get_version(), $current['new_version'], '<')) {
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
     * Adds the hooks for the updater.
     *
     * @since 1.0.0
     * @return void
     */
    protected function add_listeners(): void
    {
        add_filter('pre_set_site_transient_update_themes', array($this, 'check_update'));
    }
    /**
     * Gets the slug for the API request.
     *
     * @since 1.0.0
     * @return string
     */
    protected function get_slug(): string
    {
        if (!empty($this->args['slug'])) {
            return $this->args['slug'];
        }
        return wp_get_theme()->get_stylesheet();
    }
    /**
     * Gets the name for the API request.
     *
     * @since 1.0.0
     * @return string
     */
    protected function get_name(): string
    {
        return $this->get_slug();
    }
    /**
     * Gets the current version information from the remote site.
     *
     * @return \stdClass|false
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
     * This is used for the update_themes transient.
     *
     * @since 1.0.0
     * @return array|false
     */
    private function get_limited_data()
    {
        $version_info = $this->get_repo_api_data();
        if (!$version_info) {
            return \false;
        }
        return array('theme' => $this->get_slug(), 'new_version' => $version_info->new_version, 'package' => $version_info->package, 'url' => $version_info->url ?? '', 'requires' => $version_info->requires ?? '', 'requires_php' => $version_info->requires_php ?? '');
    }
    /**
     * Get repo API data from store.
     * Save to cache.
     *
     * @return \stdClass|false
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
        $version_info->theme = $this->get_name();
        if (!isset($version_info->requires)) {
            $version_info->requires = '';
        }
        if (!isset($version_info->requires_php)) {
            $version_info->requires_php = '';
        }
        $this->set_version_info_cache($version_info);
        return $version_info;
    }
}
