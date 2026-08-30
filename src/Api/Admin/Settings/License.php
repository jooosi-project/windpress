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
use WindPress\WindPress\Licensing\Manager as LicenseManager;
use WindPress\WindPress\Plugin;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
class License extends AbstractApi implements ApiInterface
{
    public function __construct()
    {
    }
    public function get_prefix(): string
    {
        return 'admin/settings/license';
    }
    public function register_custom_endpoints(): void
    {
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/index', ['methods' => WP_REST_Server::READABLE, 'callback' => fn(\WP_REST_Request $wprestRequest): \WP_REST_Response => $this->index($wprestRequest), 'permission_callback' => fn(\WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/activate', ['methods' => WP_REST_Server::CREATABLE, 'callback' => fn(\WP_REST_Request $wprestRequest): \WP_REST_Response => $this->activate($wprestRequest), 'permission_callback' => fn(\WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/deactivate', ['methods' => WP_REST_Server::CREATABLE, 'callback' => fn(\WP_REST_Request $wprestRequest): \WP_REST_Response => $this->deactivate($wprestRequest), 'permission_callback' => fn(\WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
    }
    public function index(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        return new WP_REST_Response(['license' => $this->get_license()]);
    }
    public function activate(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $payload = $wprestRequest->get_json_params();
        $new_license_key = sanitize_text_field((string) ($payload['license'] ?? ''));
        if ($new_license_key === '') {
            return new WP_REST_Response(['message' => __('License key is empty', 'windpress')], 400);
        }
        $plugin_updater = Plugin::get_instance()->plugin_updater;
        if (!$plugin_updater instanceof LicenseManager) {
            return new WP_REST_Response(['message' => __('License management is unavailable in this edition.', 'windpress'), 'license' => $this->get_license()], 404);
        }
        $response = $plugin_updater->activate($new_license_key);
        if (is_wp_error($response)) {
            return $this->error_response($response);
        }
        update_option(WIND_PRESS::WP_OPTION . '_license', ['key' => $plugin_updater->get_license_key(), 'opt_in_pre_release' => (bool) $this->get_license()['opt_in_pre_release']]);
        return new WP_REST_Response(['message' => __('Plugin license key activated successfully.', 'windpress'), 'license' => $this->get_license()]);
    }
    public function deactivate(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $plugin_updater = Plugin::get_instance()->plugin_updater;
        if (!$plugin_updater instanceof LicenseManager) {
            return new WP_REST_Response(['message' => __('License management is unavailable in this edition.', 'windpress'), 'license' => $this->get_license()], 404);
        }
        $response = $plugin_updater->deactivate();
        if (is_wp_error($response)) {
            return $this->error_response($response);
        }
        update_option(WIND_PRESS::WP_OPTION . '_license', ['key' => '', 'opt_in_pre_release' => \false]);
        return new WP_REST_Response(['message' => __('Plugin license key deactivated successfully.', 'windpress'), 'license' => $this->get_license()]);
    }
    private function get_license(): array
    {
        $license = get_option(WIND_PRESS::WP_OPTION . '_license', ['key' => '', 'opt_in_pre_release' => \false]);
        $license = wp_parse_args(is_array($license) ? $license : [], ['key' => '', 'opt_in_pre_release' => \false]);
        $plugin_updater = Plugin::get_instance()->plugin_updater;
        if ($plugin_updater instanceof LicenseManager) {
            $license['key'] = $plugin_updater->get_license_key();
        }
        try {
            $license['is_activated'] = $plugin_updater instanceof LicenseManager && $plugin_updater->is_activated();
        } catch (\Throwable $throwable) {
            $license['is_activated'] = \false;
        }
        return $license;
    }
    private function error_response(WP_Error $error): WP_REST_Response
    {
        $status = $error->get_error_code() === 'license_server_unavailable' ? 502 : 422;
        return new WP_REST_Response(['message' => $error->get_error_message(), 'license' => $this->get_license()], $status);
    }
}
