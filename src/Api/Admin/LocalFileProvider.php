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
namespace WindPress\WindPress\Api\Admin;

use WindPressDeps\Symfony\Component\Finder\Finder;
use WindPressDeps\Symfony\Component\Finder\Glob;
use WindPress\WindPress\Api\AbstractApi;
use WindPress\WindPress\Api\ApiInterface;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
class LocalFileProvider extends AbstractApi implements ApiInterface
{
    public function __construct()
    {
    }
    public function get_prefix(): string
    {
        return 'admin/local-file-provider';
    }
    public function register_custom_endpoints(): void
    {
        register_rest_route(self::API_NAMESPACE, $this->get_prefix() . '/scan', ['methods' => WP_REST_Server::CREATABLE, 'callback' => fn(WP_REST_Request $wprestRequest): WP_REST_Response => $this->scan($wprestRequest), 'permission_callback' => fn(WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest)]);
    }
    public function scan(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $payload = $wprestRequest->get_json_params();
        $path = $payload['path'];
        $contents = [];
        $finder = new Finder();
        $finder->ignoreUnreadableDirs()->in(\WP_CONTENT_DIR)->files()->followLinks()->path(Glob::toRegex($path));
        foreach ($finder as $file) {
            if (!is_readable($file->getPathname())) {
                continue;
            }
            $contents[] = ['name' => $file->getFilename(), 'relative_path' => $file->getRelativePathname(), 'content' => $file->getContents()];
        }
        return new WP_REST_Response(['contents' => $contents]);
    }
}
