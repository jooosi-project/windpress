<?php

declare(strict_types=1);

namespace WindPress\WindPress\Core\Scanner;

use RuntimeException;

/**
 * Detect WordPress content mutations while a browser builds its CSS.
 */
class SourceRevision
{
    private const OPTION = 'windpress_source_revision';

    public static function register_hooks(): void
    {
        foreach ([
            'save_post', 'deleted_post',
            'created_term', 'edited_term', 'delete_term', 'set_object_terms', 'deleted_term_relationships',
            'added_term_meta', 'updated_term_meta', 'deleted_term_meta', 'profile_update', 'deleted_user',
            'added_user_meta', 'updated_user_meta', 'deleted_user_meta', 'switch_theme',
            'activated_plugin', 'deactivated_plugin', 'upgrader_process_complete',
        ] as $hook) {
            add_action($hook, [self::class, 'invalidate'], 10, 0);
        }
        foreach (['added_post_meta', 'updated_post_meta', 'deleted_post_meta'] as $hook) {
            add_action($hook, [self::class, 'invalidate_post_meta'], 10, 3);
        }
        foreach (['added_option', 'updated_option', 'deleted_option'] as $hook) {
            add_action($hook, [self::class, 'invalidate_option']);
        }
    }

    public static function get(): string
    {
        wp_cache_delete(self::OPTION, 'options');
        $revision = get_option(self::OPTION, false);
        if (! is_string($revision) || $revision === '') {
            add_option(self::OPTION, wp_generate_uuid4(), '', false);
            wp_cache_delete(self::OPTION, 'options');
            $revision = get_option(self::OPTION, false);
            if (! is_string($revision) || $revision === '') {
                throw new RuntimeException(__('Unable to initialize the source revision.', 'windpress'));
            }
        }

        return $revision;
    }

    public static function matches(string $revision): bool
    {
        return hash_equals(self::get(), $revision);
    }

    public static function invalidate(): void
    {
        update_option(self::OPTION, wp_generate_uuid4(), false);
    }

    public static function invalidate_post_meta($meta_id, int $post_id, string $meta_key): void
    {
        // Editor heartbeat refreshes this lock while source content stays unchanged.
        if ($meta_key !== '_edit_lock' && apply_filters('f!windpress/core/scanner/source_revision:track_post_meta', true, $meta_key, $post_id)) {
            self::invalidate();
        }
    }

    public static function invalidate_option(string $option): void
    {
        // Scan checkpoints and routine runtime caches must not invalidate their own build.
        if ($option === self::OPTION || strpos($option, 'windpress_scan_') === 0
            || strpos($option, '_transient_') === 0 || strpos($option, '_site_transient_') === 0
            || in_array($option, ['cron', 'rewrite_rules', 'recently_activated', 'auto_updater.lock', 'core_updater.lock'], true)) {
            return;
        }
        if (apply_filters('f!windpress/core/scanner/source_revision:track_option', true, $option)) {
            self::invalidate();
        }
    }
}
