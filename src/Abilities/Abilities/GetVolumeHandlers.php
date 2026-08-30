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
 * Get Volume Handlers Ability
 * 
 * Retrieves available custom handlers for the WindPress Simple File System.
 * 
 * @since 3.2.0
 */
class GetVolumeHandlers
{
    /**
     * Execute the ability
     *
     * @return array Array of available handler names
     */
    public static function execute(): array
    {
        return Volume::get_available_handlers();
    }
}
