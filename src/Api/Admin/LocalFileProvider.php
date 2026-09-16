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
use WindPress\WindPress\Core\Scanner\FileScanner;
use WindPress\WindPress\Core\Scanner\SourceIndex;
use WindPress\WindPress\Core\Scanner\SourceRevision;
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
        register_rest_route(
            self::API_NAMESPACE,
            $this->get_prefix() . '/scan',
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => fn (WP_REST_Request $wprestRequest): WP_REST_Response => $this->scan($wprestRequest),
                'permission_callback' => fn (WP_REST_Request $wprestRequest): bool => $this->permission_callback($wprestRequest),
            ]
        );
    }

    public function scan(WP_REST_Request $wprestRequest): WP_REST_Response
    {
        $payload = $wprestRequest->get_json_params();
        try {
            if (! is_array($payload)) {
                throw new \InvalidArgumentException(__('A file scan requires an object payload.', 'windpress'));
            }
            $patterns = $payload['patterns'] ?? (isset($payload['path']) ? [$payload['path']] : []);
            $exclude_patterns = $payload['exclude_patterns'] ?? [];
            if (! is_array($patterns) || $patterns === [] || count($patterns) > 100 || ! is_array($exclude_patterns) || count($exclude_patterns) > 100) {
                throw new \InvalidArgumentException(__('Provide between one and 100 source patterns and at most 100 exclusions.', 'windpress'));
            }
            $batched = $payload['batch'] ?? false;
            if (! is_bool($batched)) {
                throw new \InvalidArgumentException(__('The file scan batch option must be a boolean.', 'windpress'));
            }

            if (array_key_exists('source_index', $payload)) {
                if (! $batched) {
                    throw new \InvalidArgumentException(__('Indexed file scans require batching.', 'windpress'));
                }
                $source_revision = array_key_exists('source_revision', $payload) ? $payload['source_revision'] : SourceRevision::get();
                if (! is_string($source_revision) || $source_revision === '') {
                    throw new \InvalidArgumentException(__('The source revision must be a nonempty string.', 'windpress'));
                }
                if (! SourceRevision::matches($source_revision)) {
                    throw new \RuntimeException(__('Source data changed. Restart the scan.', 'windpress'), 409);
                }

                $metadata = [
                    'next_batch' => $payload['cursor'] ?? false,
                    'source_index' => $payload['source_index'],
                    'source_revision' => $source_revision,
                    'kind' => $payload['kind'] ?? 'full',
                ];
                $result = SourceIndex::scan('local:' . FileScanner::local_scope(WP_CONTENT_DIR, $patterns, $exclude_patterns), $metadata, static function (array $metadata) use ($patterns, $exclude_patterns): array {
                    return FileScanner::scan_local(WP_CONTENT_DIR, $patterns, $exclude_patterns, $metadata['next_batch'] ?? false);
                });
                if (! SourceRevision::matches($source_revision)) {
                    throw new \RuntimeException(__('Source data changed. Restart the scan.', 'windpress'), 409);
                }
                $result['metadata']['source_revision'] = $source_revision;

                return new WP_REST_Response($result);
            }

            return new WP_REST_Response(FileScanner::scan_local(
                WP_CONTENT_DIR,
                $patterns,
                $exclude_patterns,
                $payload['cursor'] ?? false,
                $batched
            ));
        } catch (\InvalidArgumentException $throwable) {
            return new WP_REST_Response([
                'message' => $throwable->getMessage(),
            ], 400);
        } catch (\Throwable $throwable) {
            return new WP_REST_Response([
                'message' => $throwable->getMessage(),
            ], $throwable->getCode() === 409 ? 409 : 500);
        }
    }
}
