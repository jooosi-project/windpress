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
/**
 * Get Volume Entries Ability
 *
 * Retrieves all files in the WindPress Simple File System.
 *
 * @since 3.2.0
 */
class GetVolumeEntries
{
    /**
     * Execute the ability
     *
     * @return array Array of volume entries
     */
    public static function execute(): array
    {
        return array_map(static function (array $entry): array {
            unset($entry['path_on_disk']);
            return $entry;
        }, Volume::get_entries());
    }
}
