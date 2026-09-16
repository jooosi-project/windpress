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

namespace WindPress\WindPress\Integration\Bricks;

use Bricks\Database;
use WindPress\WindPress\Core\Scanner\ExtractionCache;
use WindPress\WindPress\Core\Scanner\PostQuery;

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
        if (! defined('BRICKS_VERSION')) {
            return [];
        }

        $this->post_meta_keys = [
            BRICKS_DB_PAGE_HEADER,
            BRICKS_DB_PAGE_CONTENT,
            BRICKS_DB_PAGE_FOOTER,
        ];

        return $this->get_contents($metadata);
    }

    public function get_contents($metadata): array
    {
        $contents = [];

        $post_types = Database::$global_settings['postTypes'] ?? [];
        $post_types[] = BRICKS_DB_TEMPLATE_SLUG;

        $post_types = apply_filters('f!windpress/integration/bricks/compile:get_contents.post_types', $post_types);

        $this->global_classes_index = [];
        foreach (get_option(BRICKS_DB_GLOBAL_CLASSES, []) as $value) {
            $this->global_classes_index[$value['id']] = $value['name'];
        }

        $per_page = apply_filters('f!windpress/integration/bricks/compile:get_contents.post_per_page', PostQuery::batch_size());

        $scan = new PostQuery([
            'posts_per_page' => $per_page,
            'fields' => 'ids',
            'post_type' => $post_types,
            'no_found_rows' => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
            'ignore_sticky_posts' => true,
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- This only run by trigger on specific event
            'meta_query' => array_merge([
                'relation' => 'OR',
            ], array_map(static fn ($key) => [
                'key' => $key,
            ], $this->post_meta_keys)),
        ], $metadata);
        $wpQuery = $scan->query;

        if ($wpQuery->posts !== []) {
            update_meta_cache('post', $wpQuery->posts);
        }

        foreach ($wpQuery->posts as $post_id) {
            foreach ($this->get_post_metas($post_id) as $content) {
                $contents[] = $content;
            }
        }

        // Only include components in the first batch
        if ($scan->is_first_batch()) {
            array_push($contents, [
                'source_id' => 'option:bricks_components',
                'name' => 'bricks_components',
                'content' => $this->get_components(),
            ]);
        }

        return [
            'metadata' => $scan->metadata(),
            'contents' => $contents,
        ];
    }

    public function get_post_metas($post_id): array
    {
        $contents = [];

        foreach ($this->post_meta_keys as $post_metum_key) {
            $meta_value = get_post_meta($post_id, $post_metum_key, true);
            if ($meta_value) {
                $source_id = 'post:' . $post_id . ':meta:' . $post_metum_key;
                $contents[] = [
                    'source_id' => $source_id,
                    'name' => $post_id,
                    'content' => ExtractionCache::remember('bricks', $source_id, [
                        'meta' => $meta_value,
                        'global_classes' => $this->global_classes_index,
                        'version' => BRICKS_VERSION,
                    ], function () use ($meta_value): array {
                        return $this->transform_meta_value($meta_value);
                    }),
                ];
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
                        $meta_value[$key]['settings']['_cssGlobalClasses'] = array_map(
                            fn ($class) => array_key_exists($class, $this->global_classes_index)
                                ? $this->global_classes_index[$class]
                                : $class,
                            $global_classes
                        );
                    }
                }

                // if "code" exists and "executeCode" is false, remove the code
                if (array_key_exists('code', $node['settings']) && (! array_key_exists('executeCode', $node['settings']) || $node['settings']['executeCode'] === false)) {
                    unset($meta_value[$key]['settings']['code']);
                }
            }
        }

        return $meta_value;
    }

    public function get_components(): array
    {
        $components = get_option('bricks_components', []);

        return ExtractionCache::remember('bricks', 'option:bricks_components', [
            'components' => $components,
            'global_classes' => $this->global_classes_index,
            'version' => BRICKS_VERSION,
        ], function () use ($components): array {
            foreach ($components as $key => $value) {
                $components[$key]['elements'] = $this->transform_meta_value($components[$key]['elements'] ?? []);
            }

            return $components;
        });
    }
}
