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
namespace WindPress\WindPress\Api;

interface ApiInterface
{
    /**
     * Get the API endpoint prefix.
     */
    public function get_prefix(): string;
    /**
     * Register custom REST API endpoints as described in the [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/).
     *
     * @see https://developer.wordpress.org/reference/functions/register_rest_route/
     */
    public function register_custom_endpoints(): void;
}
