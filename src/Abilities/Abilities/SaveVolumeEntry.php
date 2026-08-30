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
 * Save Volume Entry Ability
 *
 * Saves or updates a single file in the WindPress Simple File System.
 *
 * @since 3.2.0
 */
class SaveVolumeEntry
{
    /**
     * Execute the ability
     *
     * @param array $input Input with file data
     * @return array|WP_Error Success status with entry data or error
     */
    public static function execute($input)
    {
        if (!is_array($input)) {
            return new WP_Error('invalid_input', __('Input must be an object.', 'windpress'), ['status' => 400]);
        }
        // Set default handler if not provided
        if (!isset($input['handler'])) {
            $input['handler'] = 'internal';
        }
        // Validate required fields
        $required_fields = ['name', 'relative_path', 'content'];
        foreach ($required_fields as $field) {
            if (!isset($input[$field])) {
                return new WP_Error('invalid_input', sprintf(
                    /* translators: %s: field name */
                    __('Field "%s" is required.', 'windpress'),
                    $field
                ), ['status' => 400]);
            }
        }
        if ($input['content'] === '') {
            return new WP_Error('invalid_input', __('Save abilities do not accept empty content because empty content deletes files. Use the delete or reset ability instead.', 'windpress'), ['status' => 400]);
        }
        try {
            // Save the entry using the existing Volume::save_entries method
            $result = Volume::save_entries([$input]);
            if (!empty($result['errors']) || !empty($result['skipped']) || empty($result['saved']) && empty($result['handled'])) {
                return new WP_Error('save_failed', __('The entry could not be saved.', 'windpress'), ['status' => empty($result['errors']) ? 400 : 500, 'details' => $result]);
            }
            $saved_relative_path = $result['saved'][0]['relative_path'] ?? $result['handled'][0]['relative_path'] ?? $input['relative_path'];
            // Retrieve the saved entry to return
            $entries = Volume::get_entries();
            $saved_entry = null;
            foreach ($entries as $entry) {
                if ($entry['relative_path'] === $saved_relative_path) {
                    unset($entry['path_on_disk']);
                    $saved_entry = $entry;
                    break;
                }
            }
            $response = ['success' => \true, 'message' => sprintf(
                /* translators: %s: file name */
                __('File "%s" saved successfully.', 'windpress'),
                $input['name']
            )];
            if ($saved_entry !== null) {
                $response['entry'] = $saved_entry;
            }
            return $response;
        } catch (\Throwable $throwable) {
            return new WP_Error('save_failed', sprintf(
                /* translators: %s: error message */
                __('Failed to save entry: %s', 'windpress'),
                $throwable->getMessage()
            ), ['status' => 500]);
        }
    }
}
