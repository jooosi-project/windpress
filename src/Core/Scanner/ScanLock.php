<?php

declare(strict_types=1);

namespace WindPress\WindPress\Core\Scanner;

class ScanLock
{
    private const LEASE_SECONDS = 300;

    public static function acquire(string $resource): ?string
    {
        global $wpdb;

        $option = self::option_name($resource);
        $previous = get_option($option, false);
        if (is_array($previous) && ($previous['expires'] ?? 0) <= time()) {
            // Compare the entire observed lease so another request's replacement survives.
            $wpdb->delete($wpdb->options, [
                'option_name' => $option,
                'option_value' => maybe_serialize($previous),
            ]);
            wp_cache_delete($option, 'options');
        }

        $token = wp_generate_uuid4();
        $acquired = add_option($option, [
            'token' => $token,
            'expires' => time() + self::LEASE_SECONDS,
        ], '', false);

        return $acquired ? $token : null;
    }

    public static function is_owner(string $resource, string $token): bool
    {
        $option = self::option_name($resource);
        wp_cache_delete($option, 'options');
        $lease = get_option($option, false);

        return is_array($lease) && ($lease['token'] ?? null) === $token && ($lease['expires'] ?? 0) > time();
    }

    public static function release(string $resource, string $token): void
    {
        global $wpdb;

        $option = self::option_name($resource);
        wp_cache_delete($option, 'options');
        $lease = get_option($option, false);
        if (is_array($lease) && ($lease['token'] ?? null) === $token) {
            $wpdb->delete($wpdb->options, [
                'option_name' => $option,
                'option_value' => maybe_serialize($lease),
            ]);
            wp_cache_delete($option, 'options');
        }
    }

    private static function option_name(string $resource): string
    {
        return 'windpress_scan_lock_' . hash('sha256', $resource);
    }
}
