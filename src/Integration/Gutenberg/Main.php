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

namespace WindPress\WindPress\Integration\Gutenberg;

use WindPress\WindPress\Integration\IntegrationInterface;
use WindPress\WindPress\Utils\Common;
use WindPress\WindPress\Utils\Config;

/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Main implements IntegrationInterface
{
    public function __construct()
    {
        add_filter('f!windpress/core/cache:compile.providers', fn(array $providers): array => $this->register_provider($providers));

        if ($this->is_enabled()) {
            if (Config::get(sprintf('integration.%s.editor.enabled', $this->get_name()), true)) {
                new Editor();
            }

            CommonBlock::get_instance();
        }
    }

    public function get_name(): string
    {
        return 'gutenberg';
    }

    public function is_enabled(): bool
    {
        return (bool) apply_filters(
            'f!windpress/integration/gutenberg:enabled',
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
            'name' => __('Gutenberg', 'windpress'),
            'description' => __('Gutenberg/Block Editor integration', 'windpress'),
            'callback' => Config::get(sprintf('integration.%s.compile.enabled', $this->get_name()), true)
                    ? Compile::class
                    : static fn() => []
            ,
            'enabled' => $this->is_enabled(),
            'type' => 'custom',
            'homepage' => 'https://wordpress.org/gutenberg/?ref=jooosi',
            'is_installed_active' => static function () {
                $is = -1;
                $is += function_exists('register_block_type') ? 1 : 0;
                $is += function_exists('register_block_type') ? 1 : 0;
                return $is;
            },
        ];

        return $providers;
    }
}
