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
namespace WindPress\WindPress\Abilities\Abilities;

use WIND_PRESS;
use WindPress\WindPress\Core\Runtime;
use WindPress\WindPress\Core\Volume;
use WP_Error;
/**
 * Reset Volume Entry Ability
 *
 * Resets main.css, tailwind.config.js, or wizard files to their default content.
 *
 * @since 3.2.0
 */
class ResetVolumeEntry
{
    /**
     * Execute the ability
     *
     * @param array $input Input with relative_path
     * @return array|WP_Error Success status with default content or error
     */
    public static function execute($input)
    {
        if (!is_array($input)) {
            return new WP_Error('invalid_input', __('Input must be an object.', 'windpress'), ['status' => 400]);
        }
        $relative_path = $input['relative_path'] ?? '';
        // List of files that can be reset
        $resettable_files = ['main.css', 'tailwind.config.js', 'wizard.js', 'wizard.css'];
        if (!in_array($relative_path, $resettable_files, \true)) {
            return new WP_Error('invalid_file', sprintf(
                /* translators: %s: comma-separated list of file names */
                __('Only these files can be reset: %s', 'windpress'),
                implode(', ', $resettable_files)
            ), ['status' => 400]);
        }
        $tailwind_version = Runtime::tailwindcss_version();
        $stubs_dir = dirname(WIND_PRESS::FILE) . '/stubs/tailwindcss-v' . $tailwind_version;
        // Determine the stub file path
        $stub_file = $stubs_dir . '/' . $relative_path;
        if (!file_exists($stub_file)) {
            return new WP_Error('stub_not_found', sprintf(
                /* translators: %s: file name */
                __('Default content for "%s" is not available for Tailwind CSS v%d.', 'windpress'),
                $relative_path,
                $tailwind_version
            ), ['status' => 404]);
        }
        try {
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file
            $default_content = file_get_contents($stub_file);
            if ($default_content === \false) {
                return new WP_Error('stub_not_readable', sprintf(
                    /* translators: %s: file name */
                    __('Default content for "%s" could not be read.', 'windpress'),
                    $relative_path
                ), ['status' => 500]);
            }
            // Get the current entry to retrieve its signature
            $entries = Volume::get_entries();
            $current_entry = null;
            foreach ($entries as $entry) {
                if ($entry['relative_path'] === $relative_path) {
                    $current_entry = $entry;
                    break;
                }
            }
            // If entry doesn't exist, create a new signature
            if (!$current_entry) {
                $signature = wp_create_nonce(sprintf('%s:%s', WIND_PRESS::WP_OPTION, $relative_path));
            } else {
                $signature = $current_entry['signature'];
            }
            // Save the entry with default content
            $entry_to_reset = ['name' => basename($relative_path), 'relative_path' => $relative_path, 'content' => $default_content, 'handler' => 'internal', 'signature' => $signature];
            $result = Volume::save_entries([$entry_to_reset]);
            if (!empty($result['errors']) || !empty($result['skipped']) || empty($result['saved'])) {
                return new WP_Error('reset_failed', __('The entry could not be reset.', 'windpress'), ['status' => empty($result['errors']) ? 400 : 500, 'details' => $result]);
            }
            return ['success' => \true, 'message' => sprintf(
                /* translators: %s: file name */
                __('File "%s" reset to default successfully.', 'windpress'),
                $relative_path
            ), 'content' => $default_content];
        } catch (\Throwable $throwable) {
            return new WP_Error('reset_failed', sprintf(
                /* translators: %s: error message */
                __('Failed to reset entry: %s', 'windpress'),
                $throwable->getMessage()
            ), ['status' => 500]);
        }
    }
}
