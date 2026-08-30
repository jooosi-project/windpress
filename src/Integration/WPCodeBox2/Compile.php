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
namespace WindPress\WindPress\Integration\WPCodeBox2;

/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Compile
{
    public function __invoke($metadata): array
    {
        if (!defined('WPCODEBOX2_VERSION')) {
            return [];
        }
        return $this->get_contents($metadata);
    }
    public function get_contents($metadata): array
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'wpcb_snippets';
        $contents = [];
        $next_batch = $metadata['next_batch'] !== \false ? $metadata['next_batch'] : 1;
        $per_page = apply_filters('f!windpress/integration/wpcodebox2/compile:get_contents.post_per_page', (int) get_option('posts_per_page', 20));
        $sql = $wpdb->prepare(
            'SELECT id, title, original_code FROM %i WHERE enabled = %d LIMIT %d OFFSET %d',
            $table_name,
            1,
            // enabled
            $per_page,
            ($next_batch - 1) * $per_page
        );
        $results = $wpdb->get_results($sql, \ARRAY_A);
        foreach ($results as $result) {
            $contents[] = ['id' => $result['id'], 'title' => sprintf('#%s: %s', $result['id'], $result['title']), 'content' => $result['original_code']];
        }
        $post_count = count($results);
        $has_more = $per_page > 0 && $post_count === $per_page;
        return ['metadata' => ['total_batches' => \false, 'next_batch' => $has_more ? $next_batch + 1 : \false], 'contents' => $contents];
    }
}
