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
namespace WindPress\WindPress\Integration;

interface IntegrationInterface
{
    /**
     * Get the Integration name (slug).
     */
    public function get_name(): string;
    /**
     * Check if the Integration is enabled.
     */
    public function is_enabled(): bool;
}
