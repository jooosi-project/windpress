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

namespace WindPress\WindPress\Integration\WPCodeBox2;

use InvalidArgumentException;
use RuntimeException;
use WindPress\WindPress\Core\Scanner\PostQuery;

/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Compile
{
    public function __invoke($metadata): array
    {
        if (! defined('WPCODEBOX2_VERSION')) {
            return [];
        }

        return $this->get_contents($metadata);
    }

    public function get_contents($metadata): array
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'wpcb_snippets';

        $contents = [];

        $cursor = $metadata['next_batch'] ?? false;
        $per_page = PostQuery::batch_size(apply_filters('f!windpress/integration/wpcodebox2/compile:get_contents.post_per_page', PostQuery::batch_size()));
        $after_id = 0;
        $offset = 0;

        if (is_string($cursor) && strpos($cursor, 'snippets:') === 0) {
            $state = json_decode((string) base64_decode(substr($cursor, 9), true), true);
            if (! is_array($state) || ! isset($state['after'], $state['max'], $state['size'])
                || ! is_int($state['after']) || ! is_int($state['max']) || ! is_int($state['size'])
                || $state['after'] < 0 || $state['max'] < $state['after']
                || $state['size'] < 1 || $state['size'] > 200
            ) {
                throw new InvalidArgumentException(__('The snippet scan cursor is invalid. Restart the scan.', 'windpress'));
            }

            $after_id = $state['after'];
            $maximum_id = $state['max'];
            $per_page = $state['size'];
        } else {
            if ($cursor !== false && $cursor !== null) {
                if ((! is_int($cursor) && ! is_string($cursor)) || ! ctype_digit((string) $cursor) || (int) $cursor < 1) {
                    throw new InvalidArgumentException(__('The snippet scan page is invalid.', 'windpress'));
                }

                $offset = ((int) $cursor - 1) * $per_page;
            }

            $maximum_id = (int) $wpdb->get_var($wpdb->prepare('SELECT MAX(id) FROM %i', $table_name));
            if ($wpdb->last_error !== '') {
                throw new RuntimeException(__('Unable to initialize the snippet scan.', 'windpress'));
            }
        }

        $sql = $wpdb->prepare(
            'SELECT id, title, original_code FROM %i WHERE enabled = %d AND id > %d AND id <= %d ORDER BY id ASC LIMIT %d OFFSET %d',
            $table_name,
            1, // enabled
            $after_id,
            $maximum_id,
            $per_page,
            $offset
        );

        $results = $wpdb->get_results($sql, ARRAY_A);
        if ($wpdb->last_error !== '' || ! is_array($results)) {
            throw new RuntimeException(__('Unable to read a snippet scan batch.', 'windpress'));
        }

        foreach ($results as $result) {
            $contents[] = [
                'source_id' => 'snippet:' . $result['id'],
                'id' => $result['id'],
                'title' => sprintf('#%s: %s', $result['id'], $result['title']),
                'content' => $result['original_code'],
            ];
        }

        $post_count = count($results);
        $last_id = $post_count > 0 ? (int) $results[$post_count - 1]['id'] : 0;
        $has_more = $post_count === $per_page && $last_id > $after_id && $last_id < $maximum_id;

        return [
            'metadata' => [
                'total_batches' => false,
                'next_batch' => $has_more ? 'snippets:' . base64_encode(wp_json_encode([
                    'after' => $last_id,
                    'max' => $maximum_id,
                    'size' => $per_page,
                ])) : false,
            ],
            'contents' => $contents,
        ];
    }
}
