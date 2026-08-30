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
namespace WindPress\WindPress\Integration\Bricks;

use Bricks\Database;
use WP_Query;
/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Compile
{
    private array $post_meta_keys = [];
    private array $global_classes_index = [];
    /**
     * @param array $metadata
     */
    public function __invoke($metadata): array
    {
        if (!defined('BRICKS_VERSION')) {
            return [];
        }
        $this->post_meta_keys = [\BRICKS_DB_PAGE_HEADER, \BRICKS_DB_PAGE_CONTENT, \BRICKS_DB_PAGE_FOOTER];
        return $this->get_contents($metadata);
    }
    public function get_contents($metadata): array
    {
        $contents = [];
        $post_types = Database::$global_settings['postTypes'] ?? [];
        $post_types[] = \BRICKS_DB_TEMPLATE_SLUG;
        $post_types = apply_filters('f!windpress/integration/bricks/compile:get_contents.post_types', $post_types);
        foreach (get_option(\BRICKS_DB_GLOBAL_CLASSES, []) as $value) {
            $this->global_classes_index[$value['id']] = $value['name'];
        }
        $next_batch = $metadata['next_batch'] !== \false ? $metadata['next_batch'] : 1;
        $per_page = apply_filters('f!windpress/integration/bricks/compile:get_contents.post_per_page', (int) get_option('posts_per_page', 20));
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
        // Only include components in the first batch
        if ($next_batch === 1) {
            array_push($contents, ['name' => 'bricks_components', 'content' => $this->get_components()]);
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
                $contents[] = ['name' => $post_id, 'content' => $this->transform_meta_value($meta_value)];
            }
        }
        return $contents;
    }
    public function transform_meta_value(array $meta_value): array
    {
        foreach ($meta_value as $key => $node) {
            if (array_key_exists('settings', $node)) {
                // swap the global classes with the actual class name
                if (array_key_exists('_cssGlobalClasses', $node['settings'])) {
                    $global_classes = $node['settings']['_cssGlobalClasses'];
                    if (is_string($global_classes)) {
                        $global_classes = [$global_classes];
                    }
                    if (is_array($global_classes)) {
                        $meta_value[$key]['settings']['_cssGlobalClasses'] = array_map(fn($class) => array_key_exists($class, $this->global_classes_index) ? $this->global_classes_index[$class] : $class, $global_classes);
                    }
                }
                // if "code" exists and "executeCode" is false, remove the code
                if (array_key_exists('code', $node['settings']) && (!array_key_exists('executeCode', $node['settings']) || $node['settings']['executeCode'] === \false)) {
                    unset($meta_value[$key]['settings']['code']);
                }
            }
        }
        return $meta_value;
    }
    public function get_components(): array
    {
        $components = get_option('bricks_components', []);
        foreach ($components as $key => $value) {
            $components[$key]['elements'] = $this->transform_meta_value($components[$key]['elements'] ?? []);
        }
        return $components;
    }
}
