<?php

declare(strict_types=1);

use WindPress\WindPress\Core\Scanner\PostQuery;

require_once dirname(__DIR__, 2) . '/src/Core/Scanner/PostQuery.php';
require_once dirname(__DIR__, 2) . '/src/Integration/WPCodeBox2/Compile.php';

function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

function __(string $message, string $domain): string { return $message; }
function wp_json_encode($value): string { return json_encode($value, JSON_THROW_ON_ERROR); }
function apply_filters(string $name, $value) { return $value; }
function add_filter(string $name, callable $callback, int $priority, int $count): void { $GLOBALS['where_filter'] = $callback; }
function remove_filter(string $name, callable $callback, int $priority): void { unset($GLOBALS['where_filter']); }

class ScanDatabase
{
    public string $posts = 'wp_posts';
    public string $prefix = 'wp_';
    public string $last_error = '';
    public array $ids = [1, 2, 3, 4, 5];
    public array $prepared = [];

    public function get_var(string $sql): int { return max($this->ids); }

    public function prepare(string $sql, ...$arguments): string
    {
        $this->prepared = $arguments;
        return $sql;
    }

    public function get_results(string $sql, string $format): array
    {
        check(strpos($sql, 'ORDER BY id ASC') !== false, 'Snippet scans must use unique ordering.');
        [, , $after, $max, $size, $offset] = $this->prepared;
        $ids = array_values(array_filter($this->ids, static fn (int $id): bool => $id > $after && $id <= $max));
        return array_map(static fn (int $id): array => ['id' => $id, 'title' => '', 'original_code' => 'text-red-500'], array_slice($ids, $offset, $size));
    }
}

class WP_Query
{
    public array $posts = [];
    public array $arguments = [];
    public array $query_vars = [];

    public function query(array $arguments): void
    {
        $this->arguments = $arguments;
        $this->query_vars = $arguments;
        check($arguments['orderby'] === 'ID' && $arguments['order'] === 'ASC', 'Post scans must use unique ordering.');
        check($arguments['no_found_rows'] === true, 'Scanning must not count all rows.');
        $filter = $GLOBALS['where_filter'];
        check($filter('original', new self()) === 'original', 'Cursor must not affect nested queries.');
        $filter('', $this);
        [$after, $max] = $GLOBALS['wpdb']->prepared;
        $ids = array_values(array_filter($GLOBALS['wpdb']->ids, static fn (int $id): bool => $id > $after && $id <= $max));
        $this->posts = array_slice($ids, ($arguments['paged'] - 1) * $arguments['posts_per_page'], $arguments['posts_per_page']);
        if ($GLOBALS['reverse_scan'] ?? false) {
            $this->posts = array_reverse($this->posts);
        }
        if ($GLOBALS['resize_scan'] ?? false) {
            $this->query_vars['posts_per_page'] = 1;
        }
        if ($GLOBALS['fail_query'] ?? false) {
            throw new RuntimeException('Database failure');
        }
    }
}

$GLOBALS['wpdb'] = new ScanDatabase();
$arguments = ['posts_per_page' => 2, 'post_type' => ['post']];
$first = new PostQuery($arguments);
check($first->query->posts === [1, 2], 'Initial batch is incorrect.');
check($first->is_first_batch(), 'Initial batch should include global sources.');
check(! isset($GLOBALS['where_filter']), 'Query filter leaked after scanning.');

// Deleting an earlier row must not shift the next batch; a new row belongs to the next scan.
$GLOBALS['wpdb']->ids = [2, 3, 4, 5, 6];
$second = new PostQuery($arguments, $first->metadata());
check($second->query->posts === [3, 4], 'Concurrent deletion caused a skipped row.');
check(! $second->is_first_batch(), 'Global sources must only be included once.');
$third = new PostQuery($arguments, $second->metadata());
check($third->query->posts === [5], 'Scan included rows newer than its initial maximum ID.');
check($third->metadata()['next_batch'] === false, 'The scan did not terminate.');

$legacy = new PostQuery($arguments, ['next_batch' => 2]);
check($legacy->query->posts === [4, 5], 'Legacy numeric pages are no longer accepted.');

foreach (['posts:invalid', -1, [], true] as $cursor) {
    try {
        new PostQuery($arguments, ['next_batch' => $cursor]);
        throw new RuntimeException('Invalid cursor accepted.');
    } catch (InvalidArgumentException $exception) {
    }
}

try {
    new PostQuery(['posts_per_page' => 2, 'post_type' => ['page']], $first->metadata());
    throw new RuntimeException('A cursor was accepted for a different query.');
} catch (InvalidArgumentException $exception) {
}

$GLOBALS['fail_query'] = true;
try {
    new PostQuery($arguments);
} catch (RuntimeException $exception) {
    check(! isset($GLOBALS['where_filter']), 'Query filter leaked after an exception.');
}
unset($GLOBALS['fail_query']);
foreach (['reverse_scan', 'resize_scan'] as $mutation) {
    $GLOBALS[$mutation] = true;
    try {
        new PostQuery($arguments);
        throw new RuntimeException('A query filter broke pagination without a diagnostic.');
    } catch (RuntimeException $exception) {
        check(strpos($exception->getMessage(), 'query filter') !== false, 'Changed query pagination was not rejected.');
    } finally {
        unset($GLOBALS[$mutation]);
    }
}
check(PostQuery::batch_size(99999) === 200 && PostQuery::batch_size(-1) === 50, 'Batch limits are not enforced.');

define('ARRAY_A', 'ARRAY_A');
$GLOBALS['wpdb']->ids = [1, 2, 3, 4, 5];
$snippets = new WindPress\WindPress\Integration\WPCodeBox2\Compile();
$first = $snippets->get_contents(['next_batch' => false]);
check(count($first['contents']) === 5 && $first['metadata']['next_batch'] === false, 'Snippet batch failed.');
$cursor = 'snippets:' . base64_encode(wp_json_encode(['after' => 2, 'max' => 5, 'size' => 2]));
$second = $snippets->get_contents(['next_batch' => $cursor]);
check(array_column($second['contents'], 'id') === [3, 4], 'Snippet cursor did not resume.');
$GLOBALS['wpdb']->ids = [3, 4, 5, 6];
$third = $snippets->get_contents($second['metadata']);
check(array_column($third['contents'], 'id') === [5] && $third['metadata']['next_batch'] === false, 'Snippet scan escaped its snapshot.');

echo "Post and snippet cursor checks passed.\n";
