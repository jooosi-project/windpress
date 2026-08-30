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
namespace WindPress\WindPress\Integration\OxygenClassic;

use WP_Query;
/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Compile
{
    private array $ignored_post_types = ['attachment', 'revision', 'nav_menu_item', 'custom_css', 'customize_changeset', 'oembed_cache'];
    private array $post_meta_keys = ['ct_builder_shortcodes', 'ct_builder_json'];
    /**
     * @param array $metadata
     */
    public function __invoke($metadata): array
    {
        if (!defined('CT_PLUGIN_MAIN_FILE')) {
            return [];
        }
        return $this->get_contents($metadata);
    }
    public function get_contents($metadata): array
    {
        $contents = [];
        $post_types = array_filter(get_post_types(), fn($post_type) => !in_array($post_type, apply_filters('f!windpress/integration/oxygen/compile:get_contents.ignored_post_types', $this->ignored_post_types)) && get_option('oxygen_vsb_ignore_post_type_' . $post_type) !== 'true');
        $next_batch = $metadata['next_batch'] !== \false ? $metadata['next_batch'] : 1;
        $per_page = apply_filters('f!windpress/integration/oxygen/compile:get_contents.post_per_page', (int) get_option('posts_per_page', 20));
        $wpQuery = new WP_Query([
            'posts_per_page' => $per_page,
            'paged' => $next_batch,
            'fields' => 'ids',
            'post_type' => $post_types,
            'no_found_rows' => \true,
            'update_post_meta_cache' => \false,
            'update_post_term_cache' => \false,
            'ignore_sticky_posts' => \true,
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- This only run by trigger on specific event
            'meta_query' => array_merge(['relation' => 'OR'], array_map(static fn($meta_key) => ['key' => $meta_key, 'compare' => '!=', 'value' => ''], apply_filters('f!windpress/integration/oxygen/compile:get_contents.post_meta_keys', $this->post_meta_keys))),
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
        $shortcode = get_post_meta($post_id, 'ct_builder_json', \true);
        if ($shortcode) {
            return [['content' => json_decode($shortcode, \true)]];
        }
        $shortcode = get_post_meta($post_id, 'ct_builder_shortcodes', \true);
        if (!is_array($shortcode)) {
            $shortcode = json_decode(oxygen_safe_convert_old_shortcodes_to_json($shortcode), \true);
        }
        if (!is_array($shortcode)) {
            return [];
        }
        return [['content' => $shortcode]];
    }
}
