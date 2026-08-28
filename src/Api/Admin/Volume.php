<?php

/*
 * This file is part of the WindPress package.
 *
 * (c) Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

namespace WindPress\WindPress\Api\Admin;

use WindPress\WindPress\Api\AbstractApi;
use WindPress\WindPress\Api\ApiInterface;
use WindPress\WindPress\Core\Volume as CoreVolume;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class Volume extends AbstractApi implements ApiInterface
{
    public function __construct()
    {
    }

    public function get_prefix(): string
    {
        return 'admin/volume';
    }

    public function register_custom_endpoints(): void
    {
        register_rest_route(
            self::API_NAMESPACE,
            $this->get_prefix() . '/index',
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => fn (WP_REST_Request $wprestRequest): WP_REST_Response => $this->index($wprestRequest),
                'permission_callback' => fn (WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest),
            ]
        );

        register_rest_route(
            self::API_NAMESPACE,
            $this->get_prefix() . '/store',
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => fn (WP_REST_Request $wprestRequest): WP_REST_Response => $this->store($wprestRequest),
                'permission_callback' => fn (WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest),
            ]
        );

        register_rest_route(
            self::API_NAMESPACE,
            $this->get_prefix() . '/handlers',
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => fn (WP_REST_Request $wprestRequest): WP_REST_Response => $this->handlers($wprestRequest),
                'permission_callback' => fn (WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest),
            ]
        );
    }

    public function index(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        return new WP_REST_Response([
            'entries' => CoreVolume::get_entries(),
        ]);
    }

    public function store(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $payload = $wprestRequest->get_json_params();

        $entries = $payload['volume']['entries'];

        $result = CoreVolume::save_entries($entries);

        if (! empty($result['errors']) || ! empty($result['skipped'])) {
            return new WP_REST_Response([
                'success' => false,
                'message' => __('Some entries could not be saved.', 'windpress'),
                'details' => $result,
            ], empty($result['errors']) ? 400 : 500);
        }

        return new WP_REST_Response([
            'success' => true,
            'message' => __('data stored successfully', 'windpress'),
        ]);
    }

    public function handlers(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        return new WP_REST_Response([
            'handlers' => CoreVolume::get_available_handlers(),
        ]);
    }
}
