<?php

/*
 * This file is part of the WindPress package.
 *
 * (c) Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

namespace WindPress\WindPress\Integration\Kadence;

use WindPress\WindPress\Integration\IntegrationInterface;
use WindPress\WindPress\Utils\Common;
use WindPress\WindPress\Utils\Config;

/**
 * Tested with Kadence theme version 1.2.9 and Kadence Blocks version 3.2.52
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Main implements IntegrationInterface
{
    public function __construct()
    {
        add_filter('f!windpress/core/cache:compile.providers', fn (array $providers): array => $this->register_provider($providers));
    }

    public function get_name(): string
    {
        return 'kadence';
    }

    public function is_enabled(): bool
    {
        return (bool) apply_filters(
            'f!windpress/integration/kadence:enabled',
            Config::get(sprintf(
                'integration.%s.enabled',
                $this->get_name()
            ), true)
        );
    }

    public function register_provider(array $providers): array
    {
        $providers[] = [
            'id' => $this->get_name(),
            'name' => __('Kadence WP', 'windpress'),
            'description' => __('The Kadence WP integration. It requires the Gutenberg/Block Editor integration enabled.', 'windpress'),
            'enabled' => $this->is_enabled(),
            'callback' => Config::get(sprintf('integration.%s.compile.enabled', $this->get_name()), true)
                    ? Compile::class
                    : static fn() => []
            ,
            'type' => 'theme',
            'homepage' => 'https://kadencewp.com/?ref=jooosi',
            'is_installed_active' => static function () {
                $is = -1;
                $is += Common::is_theme_installed('Kadence') ? 1 : 0;
                $is += Common::is_theme_active_by_name('Kadence') ? 1 : 0;
                return $is;
            },
            'meta' => [
                'experimental' => true,
            ],
        ];

        return $providers;
    }
}
