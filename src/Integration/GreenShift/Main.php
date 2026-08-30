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
namespace WindPress\WindPress\Integration\GreenShift;

use WindPress\WindPress\Integration\IntegrationInterface;
use WindPress\WindPress\Utils\Common;
use WindPress\WindPress\Utils\Config;
/**
 * Tested with GreenShift version 9.4
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Main implements IntegrationInterface
{
    public function __construct()
    {
        add_filter('f!windpress/core/cache:compile.providers', fn(array $providers): array => $this->register_provider($providers));
    }
    public function get_name(): string
    {
        return 'greenshift';
    }
    public function is_enabled(): bool
    {
        return (bool) apply_filters('f!windpress/integration/greenshift:enabled', Config::get(sprintf('integration.%s.enabled', $this->get_name()), \true));
    }
    public function register_provider(array $providers): array
    {
        $providers[] = ['id' => $this->get_name(), 'name' => __('GreenShift', 'windpress'), 'description' => __('The GreenShift integration. It requires the Gutenberg/Block Editor integration enabled.', 'windpress'), 'callback' => Config::get(sprintf('integration.%s.compile.enabled', $this->get_name()), \true) ? \WindPress\WindPress\Integration\GreenShift\Compile::class : static fn() => [], 'enabled' => $this->is_enabled(), 'type' => 'plugin', 'homepage' => 'https://shop.greenshiftwp.com/?from=3679', 'is_installed_active' => static function () {
            $is = -1;
            $is += Common::is_plugin_installed('GreenShift - Animation and Page Builder Blocks') ? 1 : 0;
            $is += Common::is_plugin_active_by_name('GreenShift - Animation and Page Builder Blocks') ? 1 : 0;
            return $is;
        }, 'meta' => ['experimental' => \true]];
        return $providers;
    }
}
