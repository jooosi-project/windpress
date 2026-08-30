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
namespace WindPress\WindPress\Api\Admin\Settings;

use WIND_PRESS;
use WindPress\WindPress\Api\AbstractApi;
use WindPress\WindPress\Api\ApiInterface;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
class Options extends AbstractApi implements ApiInterface
{
    public function __construct()
    {
    }
    public function get_prefix(): string
    {
        return 'admin/settings/options';
    }
    public function register_custom_endpoints(): void
    {
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/index', ['methods' => WP_REST_Server::READABLE, 'callback' => fn(\WP_REST_Request $wprestRequest): \WP_REST_Response => $this->index($wprestRequest), 'permission_callback' => fn(\WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/store', ['methods' => WP_REST_Server::CREATABLE, 'callback' => fn(\WP_REST_Request $wprestRequest): \WP_REST_Response => $this->store($wprestRequest), 'permission_callback' => fn(\WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
    }
    public function index(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $options = json_decode(get_option(WIND_PRESS::WP_OPTION . '_options', '{}'), null, 512, \JSON_THROW_ON_ERROR);
        $options = apply_filters('f!windpress/api/admin/settings/options:index', $options);
        return new WP_REST_Response(['options' => $options]);
    }
    public function store(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $payload = $wprestRequest->get_json_params();
        $options = $payload['options'];
        if (empty($options)) {
            $options = (object) $options;
        }
        $options = apply_filters('f!windpress/api/admin/settings/options:store.before', $options);
        update_option(WIND_PRESS::WP_OPTION . '_options', wp_json_encode($options, \JSON_THROW_ON_ERROR));
        do_action('a!windpress/api/admin/settings/options:store.after', $options);
        return new WP_REST_Response(['message' => __('Settings updated', 'windpress')]);
    }
}
