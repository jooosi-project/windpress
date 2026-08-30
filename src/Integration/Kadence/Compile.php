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
namespace WindPress\WindPress\Integration\Kadence;

use WP_Query;
/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Compile
{
    /**
     * @param array $metadata
     */
    public function __invoke($metadata): array
    {
        if (!defined('KADENCE_VERSION') && !defined('KADENCE_BLOCKS_VERSION')) {
            return [];
        }
        return $this->get_contents($metadata);
    }
    public function get_contents($metadata): array
    {
        $contents = [];
        $post_types = apply_filters('f!windpress/integration/kadence/compile:get_contents.post_types', ['kadence_form', 'kadence_element']);
        $next_batch = $metadata['next_batch'] !== \false ? $metadata['next_batch'] : 1;
        $per_page = apply_filters('f!windpress/integration/kadence/compile:get_contents.post_per_page', (int) get_option('posts_per_page', 20));
        $wpQuery = new WP_Query(['posts_per_page' => $per_page, 'post_type' => $post_types, 'paged' => $next_batch, 'no_found_rows' => \true, 'update_post_meta_cache' => \false, 'update_post_term_cache' => \false, 'ignore_sticky_posts' => \true]);
        foreach ($wpQuery->posts as $post) {
            $post_content = $post->post_content;
            $post_content_trimmed = trim($post_content);
            if ($post_content_trimmed === '' || $post_content_trimmed === '0') {
                continue;
            }
            if (apply_filters('f!windpress/integration/kadence/compile:get_contents.render', \false, $post)) {
                $fn_renders = apply_filters('f!windpress/integration/kadence/compile:get_contents.render_fn', [], $post);
                foreach ($fn_renders as $fn_render) {
                    try {
                        $post_content = $fn_render($post_content);
                    } catch (\Throwable $th) {
                        if (\WP_DEBUG) {
                            error_log($th->getMessage());
                        }
                    }
                }
            }
            $post_content = apply_filters('f!windpress/integration/kadence/compile:get_contents.post_content', $post_content, $post);
            $contents[] = ['id' => $post->ID, 'title' => sprintf('#%s: %s', $post->ID, $post->post_title), 'content' => $post_content];
        }
        $post_count = count($wpQuery->posts);
        $has_more = $per_page > 0 && $post_count === $per_page;
        return ['metadata' => ['next_batch' => $has_more ? $next_batch + 1 : \false, 'total_batches' => \false], 'contents' => $contents];
    }
}
