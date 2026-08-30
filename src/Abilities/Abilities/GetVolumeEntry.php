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

use WindPress\WindPress\Core\Volume;
use WP_Error;
/**
 * Get Volume Entry Ability
 *
 * Retrieves a single file from the WindPress Simple File System by its relative path.
 *
 * @since 3.2.0
 */
class GetVolumeEntry
{
    /**
     * Execute the ability
     *
     * @param array $input Input with relative_path
     * @return array|WP_Error Single volume entry or error
     */
    public static function execute($input)
    {
        if (!is_array($input)) {
            return new WP_Error('invalid_input', __('Input must be an object.', 'windpress'), ['status' => 400]);
        }
        $relative_path = $input['relative_path'] ?? '';
        if (empty($relative_path)) {
            return new WP_Error('invalid_input', __('Relative path is required.', 'windpress'), ['status' => 400]);
        }
        $entries = Volume::get_entries();
        // Find the entry by relative_path
        foreach ($entries as $entry) {
            if ($entry['relative_path'] === $relative_path) {
                unset($entry['path_on_disk']);
                return $entry;
            }
        }
        return new WP_Error('entry_not_found', sprintf(
            /* translators: %s: file path */
            __('File not found: %s', 'windpress'),
            $relative_path
        ), ['status' => 404]);
    }
}
