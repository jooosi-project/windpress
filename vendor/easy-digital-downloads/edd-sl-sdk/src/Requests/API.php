<?php

/**
 * Licensing API
 *
 * Tool for making requests to the Software Licensing API.
 *
 * @package   easy-digital-downloads-updater
 * @copyright Copyright (c) 2024, Easy Digital Downloads, LLC
 * @license   GPLv2 or later
 * @since     1.0.0
 */
namespace EasyDigitalDownloads\Updater\Requests;

// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
/**
 * Represents the API class for handling licensing.
 */
class API
{
    /**
     * The API URL.
     *
     * @var string
     */
    private $api_url;
    /**
     * The class constructor.
     *
     * @since 1.0.0
     * @param null|string $url Optional; used only for requests to non-EDD sites.
     */
    public function __construct($url)
    {
        $this->api_url = $url;
    }
    /**
     * Gets the API URL.
     *
     * @since 1.0.0
     * @return string
     */
    public function get_url()
    {
        return $this->api_url;
    }
    /**
     * Makes a request to the Software Licensing API.
     *
     * @since 1.0.0
     * @param array $api_params The parameters for the API request.
     * @return false|stdClass
     */
    public function make_request($api_params = array())
    {
        if (empty($api_params) || !is_array($api_params)) {
            return \false;
        }
        // If a request has recently failed, don't try again.
        if ($this->request_recently_failed()) {
            return \false;
        }
        $request = wp_remote_get(add_query_arg($this->get_body($api_params), $this->api_url), array('timeout' => 15, 'sslverify' => apply_filters('https_ssl_verify', \true, $this->api_url)));
        // If there was an API error, return false.
        if (is_wp_error($request) || 200 !== wp_remote_retrieve_response_code($request)) {
            $this->log_failed_request();
            return \false;
        }
        return json_decode(wp_remote_retrieve_body($request));
    }
    /**
     * Updates the API parameters with the defaults.
     *
     * @param array $api_params The parameters for the specific request.
     * @return array
     */
    private function get_body(array $api_params)
    {
        /**
         * Filters the API parameters. The hook is specific to the API URL.
         * For example, if the API URL is https://example.com, the hook will be `edd_sl_sdk_api_params_example`.
         *
         * @since 1.0.0
         * @param array $api_params The parameters for the specific request.
         * @param string $api_url The API URL.
         * @return array
         */
        return apply_filters($this->get_api_filter_hook(), wp_parse_args($api_params, array('url' => rawurlencode(home_url()), 'environment' => wp_get_environment_type())), $this->api_url);
    }
    /**
     * Gets the API hook.
     *
     * @since 1.0.0
     * @return string
     */
    private function get_api_filter_hook()
    {
        $url = wp_parse_url($this->api_url);
        if (empty($url['host'])) {
            return 'edd_sl_sdk_api_params';
        }
        $base = explode('.', $url['host']);
        // If the base is a subdomain, use the main domain.
        if (count($base) > 2) {
            $base = array_slice($base, 1);
        }
        return 'edd_sl_sdk_api_params_' . reset($base);
    }
    /**
     * Determines if a request has recently failed.
     *
     * @since 1.0.0
     *
     * @return bool
     */
    private function request_recently_failed()
    {
        $failed_request_details = get_option($this->get_failed_request_cache_key());
        // Request has never failed.
        if (empty($failed_request_details) || !is_numeric($failed_request_details)) {
            return \false;
        }
        /*
         * Request previously failed, but the timeout has expired.
         * This means we're allowed to try again.
         */
        if (time() > $failed_request_details) {
            delete_option($this->get_failed_request_cache_key());
            return \false;
        }
        return \true;
    }
    /**
     * Logs a failed HTTP request for this API URL.
     * We set a timestamp for 1 hour from now. This prevents future API requests from being
     * made to this domain for 1 hour. Once the timestamp is in the past, API requests
     * will be allowed again. This way if the site is down for some reason we don't bombard
     * it with failed API requests.
     *
     * @since 1.0.0
     */
    private function log_failed_request()
    {
        update_option($this->get_failed_request_cache_key(), strtotime('+1 hour'), \false);
    }
    /**
     * Retrieves the cache key for the failed requests option.
     *
     * @since 1.0.0
     * @return string The cache key for failed requests.
     */
    private function get_failed_request_cache_key()
    {
        return 'eddsdk_failed_request_' . md5($this->api_url);
    }
}
