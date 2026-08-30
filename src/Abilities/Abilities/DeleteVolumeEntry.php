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
 * Delete Volume Entry Ability
 *
 * Deletes a file from the WindPress Simple File System.
 *
 * @since 3.2.0
 */
class DeleteVolumeEntry
{
    /**
     * Execute the ability
     *
     * @param array $input Input with relative_path and signature
     * @return array|WP_Error Success status or error
     */
    public static function execute($input)
    {
        if (!is_array($input)) {
            return new WP_Error('invalid_input', __('Input must be an object.', 'windpress'), ['status' => 400]);
        }
        $relative_path = $input['relative_path'] ?? '';
        $signature = $input['signature'] ?? '';
        if (empty($relative_path)) {
            return new WP_Error('invalid_input', __('Relative path is required.', 'windpress'), ['status' => 400]);
        }
        if (empty($signature)) {
            return new WP_Error('invalid_input', __('Signature is required for security verification.', 'windpress'), ['status' => 400]);
        }
        try {
            // To delete a file, we save an entry with empty content
            // The Volume::save_entries method handles deletion when content is empty
            $entry_to_delete = [
                'name' => basename($relative_path),
                'relative_path' => $relative_path,
                'content' => '',
                // Empty content triggers deletion
                'handler' => 'internal',
                'signature' => $signature,
            ];
            $result = Volume::save_entries([$entry_to_delete]);
            if (!empty($result['errors']) || !empty($result['skipped']) || empty($result['deleted'])) {
                return new WP_Error('delete_failed', __('The entry could not be deleted. Verify the signature and relative path.', 'windpress'), ['status' => empty($result['errors']) ? 400 : 500, 'details' => $result]);
            }
            return ['success' => \true, 'message' => sprintf(
                /* translators: %s: file path */
                __('File "%s" deleted successfully.', 'windpress'),
                $relative_path
            )];
        } catch (\Throwable $throwable) {
            return new WP_Error('delete_failed', sprintf(
                /* translators: %s: error message */
                __('Failed to delete entry: %s', 'windpress'),
                $throwable->getMessage()
            ), ['status' => 500]);
        }
    }
}
