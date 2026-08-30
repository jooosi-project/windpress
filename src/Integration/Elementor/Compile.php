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
namespace WindPress\WindPress\Integration\Elementor;

use Elementor\Plugin;
use WP_Query;
/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Compile
{
    private array $post_meta_keys = ['_elementor_data'];
    /**
     * @param array $metadata
     */
    public function __invoke($metadata): array
    {
        if (!defined('ELEMENTOR_VERSION')) {
            return [];
        }
        return $this->get_contents($metadata);
    }
    public function get_contents($metadata): array
    {
        $contents = [];
        $post_types = get_option('elementor_cpt_support', Plugin::ELEMENTOR_DEFAULT_POST_TYPES);
        $post_types = apply_filters('f!windpress/integration/elementor/compile:get_contents.post_types', $post_types);
        $next_batch = $metadata['next_batch'] !== \false ? $metadata['next_batch'] : 1;
        $per_page = apply_filters('f!windpress/integration/elementor/compile:get_contents.post_per_page', (int) get_option('posts_per_page', 20));
        $wpQuery = new WP_Query([
            'posts_per_page' => $per_page,
            'paged' => $next_batch,
            'fields' => 'ids',
            'post_type' => $post_types,
            'post_status' => get_post_stati(),
            'no_found_rows' => \true,
            'update_post_meta_cache' => \false,
            'update_post_term_cache' => \false,
            'ignore_sticky_posts' => \true,
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- This only run by trigger on specific event
            'meta_query' => array_merge(['relation' => 'OR'], array_map(static fn($key) => ['key' => $key], $this->post_meta_keys)),
        ]);
        if ($wpQuery->posts !== []) {
            update_meta_cache('post', $wpQuery->posts);
        }
        foreach ($wpQuery->posts as $post_id) {
            foreach ($this->get_post_metas($post_id) as $content) {
                $contents[] = $content;
            }
        }
        $post_count = count($wpQuery->posts);
        $has_more = $per_page > 0 && $post_count === $per_page;
        return ['metadata' => ['next_batch' => $has_more ? $next_batch + 1 : \false, 'total_batches' => \false], 'contents' => $contents];
    }
    public function get_post_metas($post_id): array
    {
        $contents = [];
        foreach ($this->post_meta_keys as $post_metum_key) {
            $meta_value = get_post_meta($post_id, $post_metum_key, \true);
            if ($meta_value) {
                $contents[] = ['name' => $post_id, 'content' => $meta_value, 'type' => 'json'];
            }
        }
        return $contents;
    }
}
