<?php

declare (strict_types=1);
namespace WindPress\WindPress\Core\Scanner;

use InvalidArgumentException;
use WP_Query;
/**
 * A bounded, ID-ordered scan of posts. Numeric pages remain accepted for older callers.
 */
class PostQuery
{
    public WP_Query $query;
    private int $maximum_id;
    private int $batch_size;
    private int $after_id = 0;
    private int $page = 1;
    private string $signature;
    public function __construct(array $arguments, array $metadata = [])
    {
        global $wpdb;
        $this->batch_size = self::batch_size($arguments['posts_per_page'] ?? null);
        $this->signature = hash('sha256', wp_json_encode($arguments));
        $cursor = $metadata['next_batch'] ?? \false;
        if (is_string($cursor) && strpos($cursor, 'posts:') === 0) {
            $state = json_decode((string) base64_decode(substr($cursor, 6), \true), \true);
            if (!is_array($state) || ($state['query'] ?? null) !== $this->signature || !isset($state['after'], $state['max'], $state['size']) || !is_int($state['after']) || !is_int($state['max']) || !is_int($state['size']) || $state['after'] < 0 || $state['max'] < $state['after'] || $state['size'] < 1 || $state['size'] > 200) {
                throw new InvalidArgumentException(__('The post scan cursor is invalid. Restart the scan.', 'windpress'));
            }
            $this->after_id = $state['after'];
            $this->maximum_id = $state['max'];
            $this->batch_size = $state['size'];
        } else {
            if ($cursor !== \false && $cursor !== null) {
                if (!is_int($cursor) && !is_string($cursor) || !ctype_digit((string) $cursor) || (int) $cursor < 1) {
                    throw new InvalidArgumentException(__('The post scan page is invalid.', 'windpress'));
                }
                $this->page = (int) $cursor;
            }
            $this->maximum_id = (int) $wpdb->get_var("SELECT MAX(ID) FROM {$wpdb->posts}");
            if ($wpdb->last_error !== '') {
                throw new \RuntimeException(__('Unable to initialize the post scan.', 'windpress'));
            }
        }
        $arguments = array_merge($arguments, ['windpress_scan' => \true, 'posts_per_page' => $this->batch_size, 'paged' => $this->page, 'orderby' => 'ID', 'order' => 'ASC', 'no_found_rows' => \true, 'ignore_sticky_posts' => \true, 'suppress_filters' => \false]);
        $this->query = new WP_Query();
        $where_filter = function (string $where, WP_Query $query) use ($wpdb): string {
            if ($query !== $this->query) {
                return $where;
            }
            return $where . $wpdb->prepare(" AND {$wpdb->posts}.ID > %d AND {$wpdb->posts}.ID <= %d", $this->after_id, $this->maximum_id);
        };
        add_filter('posts_where', $where_filter, 10, 2);
        try {
            $wpdb->last_error = '';
            $this->query->query($arguments);
            if ($wpdb->last_error !== '') {
                throw new \RuntimeException(__('Unable to read a post scan batch.', 'windpress'));
            }
            if ((int) $this->query->query_vars['posts_per_page'] !== $this->batch_size || (int) ($this->query->query_vars['offset'] ?? 0) !== 0 || count($this->query->posts) > $this->batch_size) {
                throw new \RuntimeException(__('A query filter changed the scan batch limits. Exclude WindPress scans from that filter.', 'windpress'));
            }
            $previous_id = $this->after_id;
            foreach ($this->query->posts as $post) {
                $post_id = is_object($post) ? (int) $post->ID : (int) $post;
                if ($post_id <= $previous_id || $post_id > $this->maximum_id) {
                    throw new \RuntimeException(__('A query filter changed the scan ordering. Exclude WindPress scans from that filter.', 'windpress'));
                }
                $previous_id = $post_id;
            }
        } finally {
            remove_filter('posts_where', $where_filter, 10);
        }
    }
    public static function batch_size($value = null): int
    {
        $default = (int) apply_filters('f!windpress/core/scanner:batch_size', 50);
        $value = is_numeric($value) && (int) $value > 0 ? (int) $value : $default;
        return max(1, min(200, $value));
    }
    public function is_first_batch(): bool
    {
        return $this->after_id === 0 && $this->page === 1;
    }
    public function metadata(): array
    {
        $posts = $this->query->posts;
        $last_post = $posts === [] ? null : end($posts);
        $last_id = is_object($last_post) ? (int) $last_post->ID : (int) $last_post;
        $has_more = count($posts) === $this->batch_size && $last_id > $this->after_id && $last_id < $this->maximum_id;
        return ['next_batch' => $has_more ? 'posts:' . base64_encode(wp_json_encode(['after' => $last_id, 'max' => $this->maximum_id, 'size' => $this->batch_size, 'query' => $this->signature])) : \false, 'total_batches' => \false];
    }
}
