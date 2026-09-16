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

namespace WindPress\WindPress\Integration\Gutenberg;

use Symfony\Component\Yaml\Yaml;
use WindPress\WindPress\Core\Scanner\ExtractionCache;
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
        return $this->get_contents($metadata);
    }

    public function get_contents($metadata, ?callable $include_post = null): array
    {
        $contents = [];
        // Match block editor eligibility without requiring wp-admin files in REST requests.
        $block_post_types = array_filter(get_post_types([
            'show_in_rest' => true,
        ]), static function ($post_type): bool {
            return post_type_supports($post_type, 'editor')
                && apply_filters('use_block_editor_for_post_type', true, $post_type);
        });
        $post_types = apply_filters('f!windpress/integration/gutenberg/compile:get_contents.post_types', array_values(array_unique(array_merge([
            'post',
            'page',
            'wp_template',
            'wp_template_part',
            'wp_block',
        ], $block_post_types))));

        $per_page = apply_filters('f!windpress/integration/gutenberg/compile:get_contents.post_per_page', PostQuery::batch_size());

        $scan = new PostQuery([
            'posts_per_page' => $per_page,
            'post_type' => $post_types,
            'no_found_rows' => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
            'ignore_sticky_posts' => true,
        ], $metadata);
        $wpQuery = $scan->query;

        foreach ($wpQuery->posts as $post) {
            $post_content = $post->post_content;
            $post_content_trimmed = trim($post_content);
            if ($post_content_trimmed === '' || $post_content_trimmed === '0') {
                continue;
            }

            /**
             * @TODO: More robust and reliable API for external usage.
             */
            if (($include_post !== null && ! $include_post($post))
                || apply_filters('f!windpress/integration/gutenberg/compile:get_contents.skip', false, $post)) {
                continue;
            }

            if (apply_filters('f!windpress/integration/gutenberg/compile:get_contents.render', true, $post)) {
                $fn_renders = apply_filters('f!windpress/integration/gutenberg/compile:get_contents.render_fn', [
                    'do_blocks',
                    'wptexturize',
                    'convert_smilies',
                    'shortcode_unautop',
                    'wp_filter_content_tags',
                    'do_shortcode',
                ], $post);

                $post_content = PostRenderer::render($post, $fn_renders, 'Gutenberg', $wpQuery);
            }

            $post_content = apply_filters('f!windpress/integration/gutenberg/compile:get_contents.post_content', $post_content, $post);

            // Decode HTML entities to preserve arbitrary variants like [&>img]:rounded-lg
            // WordPress rendering functions encode special characters (&, >, <, etc.) but Tailwind
            // needs the raw characters for proper class parsing
            // Apply decoding twice to handle double-encoded entities (e.g., &amp;amp; -> &amp; -> &)
            if (strpos($post_content, '&') !== false) {
                $post_content = html_entity_decode($post_content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $post_content = html_entity_decode($post_content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }

            if (apply_filters('f!windpress/integration/gutenberg/compile:get_contents.dump_parsed_block', true, $post)) {
                $raw_content = $post->post_content;
                $dump_blocks = static function () use ($raw_content): string {
                    return Yaml::dump(parse_blocks($raw_content));
                };
                // Custom parsers may depend on state outside the saved post content.
                $block_dump = has_filter('block_parser_class') === false && has_filter('all') === false
                    ? ExtractionCache::remember('gutenberg.blocks', 'post:' . $post->ID, [
                        'content' => $raw_content,
                        'wordpress_version' => $GLOBALS['wp_version'] ?? '',
                    ], $dump_blocks)
                    : $dump_blocks();
                $post_content .= PHP_EOL . $block_dump;
            }

            $contents[] = [
                'source_id' => 'post:' . $post->ID,
                'id' => $post->ID,
                'title' => sprintf('#%s: %s', $post->ID, $post->post_title),
                'content' => $post_content,
            ];
        }

        return [
            'metadata' => $scan->metadata(),
            'contents' => $contents,
        ];
    }
}
