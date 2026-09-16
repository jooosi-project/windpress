<?php

declare(strict_types=1);

use WindPress\WindPress\Core\Scanner\ExtractionCache;

require_once dirname(__DIR__, 2) . '/constant.php';
require_once dirname(__DIR__, 2) . '/src/Core/Scanner/ExtractionCache.php';

$GLOBALS['user_id'] = 1;
$GLOBALS['blog_id'] = 1;
$GLOBALS['transients'] = [];
$GLOBALS['expirations'] = [];

function get_current_blog_id(): int
{
    return $GLOBALS['blog_id'];
}

function get_current_user_id(): int
{
    return $GLOBALS['user_id'];
}

function get_transient(string $key)
{
    return $GLOBALS['transients'][$key] ?? false;
}

function set_transient(string $key, $value, int $expiration): bool
{
    $GLOBALS['transients'][$key] = $value;
    $GLOBALS['expirations'][$key] = $expiration;
    return true;
}

function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

$calls = 0;
$extract = static function () use (&$calls): array {
    return ['call' => ++$calls];
};
$first = ExtractionCache::remember('bricks', 'post:1:meta:content', ['raw' => 'old'], $extract);
$warm = ExtractionCache::remember('bricks', 'post:1:meta:content', ['raw' => 'old'], $extract);
check($first === $warm && $calls === 1, 'Unchanged inputs must reuse the transformed result.');
$changed = ExtractionCache::remember('bricks', 'post:1:meta:content', ['raw' => 'new'], $extract);
check($changed !== $first && $calls === 2, 'Changed raw inputs must run extraction again.');
check(count($GLOBALS['transients']) === 1, 'Changing inputs must replace a stable cache slot.');
check(array_values($GLOBALS['expirations']) === [604800], 'Extraction entries must expire after seven days.');

$GLOBALS['user_id'] = 2;
ExtractionCache::remember('bricks', 'post:1:meta:content', ['raw' => 'new'], $extract);
$GLOBALS['blog_id'] = 2;
ExtractionCache::remember('bricks', 'post:1:meta:content', ['raw' => 'new'], $extract);
ExtractionCache::remember('elementor', 'post:1:meta:content', ['raw' => 'new'], $extract);
ExtractionCache::remember('elementor', 'post:2:meta:content', ['raw' => 'new'], $extract);
check($calls === 6 && count($GLOBALS['transients']) === 5, 'Users, sites, provider namespaces, and source identities must have separate cache slots.');

$failures = 0;
$failed_transform = static function () use (&$failures): array {
    $failures++;
    throw new RuntimeException('Extraction failed');
};
for ($attempt = 0; $attempt < 2; $attempt++) {
    try {
        ExtractionCache::remember('broken', 'post:1', ['raw' => 'source'], $failed_transform);
        throw new RuntimeException('A failed transformation must throw.');
    } catch (RuntimeException $exception) {
        check($exception->getMessage() === 'Extraction failed', 'The transformation exception must propagate unchanged.');
    }
}
check($failures === 2 && count($GLOBALS['transients']) === 5, 'Failed transformations must never be cached.');

$large_calls = 0;
$large_transform = static function () use (&$large_calls): string {
    $large_calls++;
    return str_repeat('x', 2 * 1024 * 1024);
};
for ($attempt = 0; $attempt < 2; $attempt++) {
    $result = ExtractionCache::remember('large', 'post:1', [], $large_transform);
    check(strlen($result) === 2 * 1024 * 1024, 'Oversized extraction results must still be returned intact.');
}
check($large_calls === 2 && count($GLOBALS['transients']) === 5, 'Entries exceeding the two-MiB serialized limit must not be stored.');

$null_calls = 0;
$null_transform = static function () use (&$null_calls) {
    $null_calls++;
    return null;
};
check(ExtractionCache::remember('nullable', 'post:1', [], $null_transform) === null, 'Null output must be preserved.');
check(ExtractionCache::remember('nullable', 'post:1', [], $null_transform) === null && $null_calls === 1, 'Cached null must not be mistaken for a miss.');

echo "Extraction cache tests passed.\n";
