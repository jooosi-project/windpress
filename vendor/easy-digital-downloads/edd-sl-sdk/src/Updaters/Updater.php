<?php

/**
 * Updater class.
 *
 * @since 1.0.0
 *
 * @package EasyDigitalDownloads\Updater\Updaters
 */
namespace EasyDigitalDownloads\Updater\Updaters;

// Exit if accessed directly.
defined('ABSPATH') || exit;
use EasyDigitalDownloads\Updater\Requests\API;
/**
 * Represents the updater class.
 */
abstract class Updater
{
    use \EasyDigitalDownloads\Updater\Traits\Messenger;
    /**
     * The URL for the API.
     *
     * @var string
     */
    protected $api_url;
    /**
     * The arguments for the updater.
     *
     * @var array
     */
    protected $args = array();
    /**
     * The file for the updater.
     *
     * @var string
     */
    protected $file = '';
    /**
     * The class constructor.
     *
     * @since 1.0.0
     * @param string                                       $api_url   The URL for the API.
     * @param array                                        $args      Optional; used only for requests to non-EDD sites.
     * @param \EasyDigitalDownloads\Updater\Messenger|null $messenger Optional; the messenger instance for translations.
     */
    public function __construct($api_url, $args = array(), $messenger = null)
    {
        $this->api_url = $api_url;
        $this->file = $args['file'] ?? '';
        $defaults = $this->get_api_request_defaults();
        $this->args = array_merge($defaults, array_intersect_key($args, $defaults));
        // Set messenger instance, falling back to default if not provided.
        $this->messenger = $this->get_messenger($messenger);
        $this->add_listeners();
    }
    /**
     * Adds the listeners for the updater.
     *
     * @since 1.0.0
     * @return void
     */
    abstract protected function add_listeners(): void;
    /**
     * Gets the slug for the API request.
     *
     * @since 1.0.0
     * @return string
     */
    abstract protected function get_slug(): string;
    /**
     * Gets the name for the API request.
     *
     * @since 1.0.0
     * @return string
     */
    abstract protected function get_name(): string;
    /**
     * Gets the current version information from the remote site.
     *
     * @return stdClass|false
     */
    protected function get_version_from_remote()
    {
        $api_handler = new API($this->api_url);
        return $api_handler->make_request($this->args);
    }
    /**
     * Gets the defaults for an API request.
     *
     * @since 1.0.0
     * @return array
     */
    protected function get_api_request_defaults()
    {
        return array('edd_action' => 'get_version', 'item_id' => '', 'version' => '', 'license' => '', 'php_version' => phpversion(), 'wp_version' => get_bloginfo('version'), 'slug' => $this->get_slug(), 'beta' => \false, 'allow_tracking' => \false);
    }
    /**
     * Checks if the request should be made to the remote site.
     *
     * @since 1.0.0
     * @return bool
     */
    protected function should_override_wp_check(): bool
    {
        return !empty($this->args['wp_override']);
    }
    /**
     * Gets the version number.
     *
     * @since 1.0.0
     * @return string
     */
    protected function get_version()
    {
        return $this->args['version'];
    }
    /**
     * Get the version info from the cache, if it exists.
     *
     * @param string $cache_key The cache key.
     * @return object
     */
    protected function get_cached_version_info()
    {
        $cache = get_option($this->get_cache_key());
        // Cache is expired.
        if (empty($cache['timeout']) || time() > $cache['timeout']) {
            return \false;
        }
        return json_decode($cache['value']);
    }
    /**
     * Adds the plugin version information to the database.
     *
     * @param string|\stdClass $value     The value to store.
     * @param string           $cache_key The cache key.
     */
    protected function set_version_info_cache($value = '', $cache_key = '')
    {
        if (empty($cache_key)) {
            $cache_key = $this->get_cache_key();
        }
        $data = array('timeout' => strtotime($this->get_timeout(), time()), 'value' => wp_json_encode($value));
        update_option($cache_key, $data, \false);
    }
    /**
     * Gets the unique key (option name) for a plugin.
     *
     * @since 1.0.0
     * @return string
     */
    protected function get_cache_key()
    {
        $key = md5(wp_json_encode(array($this->get_slug(), $this->args['license'], (int) (bool) $this->args['beta'])));
        return "edd_sl_{$key}";
    }
    /**
     * Gets the timeout for the cache.
     *
     * @since 1.0.0
     * @return string
     */
    private function get_timeout()
    {
        return !empty($this->args['cache_timeout']) ? $this->args['cache_timeout'] : '+3 hours';
    }
}
