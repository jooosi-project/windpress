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
 * Save Volume Entries Ability
 *
 * Saves or updates multiple files in the WindPress Simple File System at once.
 *
 * @since 3.2.0
 */
class SaveVolumeEntries
{
    /**
     * Execute the ability
     *
     * @param array $input Input with entries array
     * @return array|WP_Error Success status or error
     */
    public static function execute($input)
    {
        if (!is_array($input)) {
            return new WP_Error('invalid_input', __('Input must be an object.', 'windpress'), ['status' => 400]);
        }
        $entries = $input['entries'] ?? [];
        if (empty($entries) || !is_array($entries)) {
            return new WP_Error('invalid_input', __('Entries array is required.', 'windpress'), ['status' => 400]);
        }
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                return new WP_Error('invalid_input', __('Each entry must be an object.', 'windpress'), ['status' => 400]);
            }
            if (($entry['content'] ?? null) === '') {
                return new WP_Error('invalid_input', __('Save abilities do not accept empty content because empty content deletes files. Use the delete or reset ability instead.', 'windpress'), ['status' => 400]);
            }
        }
        try {
            $result = Volume::save_entries($entries);
            if (!empty($result['errors']) || !empty($result['skipped'])) {
                return new WP_Error('save_failed', __('Some entries could not be saved.', 'windpress'), ['status' => empty($result['errors']) ? 400 : 500, 'details' => $result]);
            }
            $saved_count = count($result['saved']) + count($result['handled']);
            if ($saved_count === 0) {
                return new WP_Error('save_failed', __('No entries were saved.', 'windpress'), ['status' => 400, 'details' => $result]);
            }
            return ['success' => \true, 'message' => sprintf(
                /* translators: %d: number of entries */
                _n('%d entry saved successfully.', '%d entries saved successfully.', $saved_count, 'windpress'),
                $saved_count
            )];
        } catch (\Throwable $throwable) {
            return new WP_Error('save_failed', sprintf(
                /* translators: %s: error message */
                __('Failed to save entries: %s', 'windpress'),
                $throwable->getMessage()
            ), ['status' => 500]);
        }
    }
}
