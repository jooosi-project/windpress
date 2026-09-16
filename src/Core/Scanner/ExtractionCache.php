<?php

declare (strict_types=1);
namespace WindPress\WindPress\Core\Scanner;

use WIND_PRESS;
/**
 * Reuses deterministic transformations of freshly read source inputs.
 */
class ExtractionCache
{
    private const VERSION = 1;
    private const TTL = 7 * 24 * 60 * 60;
    private const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
    public static function remember(string $namespace, string $identity, array $inputs, callable $extract)
    {
        $key = 'windpress_extract_' . hash('sha256', serialize([self::VERSION, WIND_PRESS::VERSION, get_current_blog_id(), get_current_user_id(), $namespace, $identity]));
        $fingerprint = hash('sha256', serialize($inputs));
        $cached = get_transient($key);
        if (is_array($cached) && ($cached['fingerprint'] ?? null) === $fingerprint && array_key_exists('result', $cached)) {
            return $cached['result'];
        }
        $result = $extract();
        $entry = ['fingerprint' => $fingerprint, 'result' => $result];
        // Cache storage is optional; the freshly extracted source remains authoritative.
        if (strlen(serialize($entry)) <= self::MAX_ENTRY_BYTES) {
            set_transient($key, $entry, self::TTL);
        }
        return $result;
    }
}
