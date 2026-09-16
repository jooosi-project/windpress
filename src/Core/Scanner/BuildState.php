<?php

declare (strict_types=1);
namespace WindPress\WindPress\Core\Scanner;

use RuntimeException;
class BuildState
{
    private const OPTION = 'windpress_scan_build_state';
    public static function get(): array
    {
        $state = get_option(self::OPTION, \false);
        if (!is_array($state) || empty($state['generation'])) {
            $initial = ['generation' => wp_generate_uuid4(), 'last_full_build' => null];
            if ($state === \false) {
                add_option(self::OPTION, $initial, '', \false);
            } else {
                update_option(self::OPTION, $initial, \false);
            }
            $state = get_option(self::OPTION, \false);
            if (!is_array($state) || empty($state['generation'])) {
                throw new RuntimeException(__('Unable to initialize the scan generation.', 'windpress'));
            }
        }
        return $state;
    }
    public static function matches(string $generation): bool
    {
        return hash_equals(self::get()['generation'], $generation);
    }
    public static function complete_full_build(): void
    {
        $state = ['generation' => wp_generate_uuid4(), 'last_full_build' => (int) round(microtime(\true) * 1000)];
        if (!update_option(self::OPTION, $state, \false)) {
            throw new RuntimeException(__('Unable to save the scan generation.', 'windpress'));
        }
    }
    public static function acquire(): ?string
    {
        return \WindPress\WindPress\Core\Scanner\ScanLock::acquire('cache-publication');
    }
    public static function release(string $token): void
    {
        \WindPress\WindPress\Core\Scanner\ScanLock::release('cache-publication', $token);
    }
}
