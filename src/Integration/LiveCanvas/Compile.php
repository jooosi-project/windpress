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
namespace WindPress\WindPress\Integration\LiveCanvas;

use WindPress\WindPress\Core\Scanner\PostQuery;
use WindPress\WindPress\Core\Scanner\PostRenderer;
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
        if (!defined('LC_MU_PLUGIN_NAME')) {
            return [];
        }
        return $this->get_contents($metadata);
    }
    public function get_contents($metadata): array
    {
        $contents = [];
        $post_types = apply_filters('f!windpress/integration/livecanvas/compile:get_contents.post_types', ['post', 'page', 'wp_template', 'lc_block', 'lc_partial', 'lc_section', 'lc_dynamic_template']);
        $per_page = apply_filters('f!windpress/integration/livecanvas/compile:get_contents.post_per_page', PostQuery::batch_size());
        $scan = new PostQuery(['posts_per_page' => $per_page, 'post_type' => $post_types, 'no_found_rows' => \true, 'update_post_meta_cache' => \false, 'update_post_term_cache' => \false, 'ignore_sticky_posts' => \true], $metadata);
        $wpQuery = $scan->query;
        foreach ($wpQuery->posts as $post) {
            $post_content = $post->post_content;
            $post_content_trimmed = trim($post_content);
            if ($post_content_trimmed === '' || $post_content_trimmed === '0') {
                continue;
            }
            if (apply_filters('f!windpress/integration/livecanvas/compile:get_contents.render', \true, $post)) {
                $post_content = PostRenderer::render($post, ['do_shortcode'], 'LiveCanvas', $wpQuery);
            }
            $post_content = apply_filters('f!windpress/integration/livecanvas/compile:get_contents.post_content', $post_content, $post);
            $contents[] = ['source_id' => 'post:' . $post->ID, 'id' => $post->ID, 'title' => sprintf('#%s: %s', $post->ID, $post->post_title), 'content' => $post_content];
        }
        return ['metadata' => $scan->metadata(), 'contents' => $contents];
    }
}
