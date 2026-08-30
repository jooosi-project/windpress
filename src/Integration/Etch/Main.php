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
namespace WindPress\WindPress\Integration\Etch;

use WindPress\WindPress\Integration\IntegrationInterface;
use WindPress\WindPress\Utils\Common;
use WindPress\WindPress\Utils\Config;
/**
 * Tested with Etch version 0.22.0
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Main implements IntegrationInterface
{
    public function __construct()
    {
        add_filter('f!windpress/core/cache:compile.providers', fn(array $providers): array => $this->register_provider($providers));
        if ($this->is_enabled()) {
            // add_filter('f!windpress/core/runtime:is_prevent_load', fn (bool $is_prevent_load): bool => $this->is_prevent_load($is_prevent_load));
            add_filter('f!windpress/core/runtime:append_header.exclude_admin', fn(bool $is_exclude_admin): bool => $this->is_exclude_admin($is_exclude_admin));
            if (Config::get(sprintf('integration.%s.editor.enabled', $this->get_name()), \true)) {
                new \WindPress\WindPress\Integration\Etch\Editor();
            }
        }
    }
    public function get_name(): string
    {
        return 'etch';
    }
    public function is_enabled(): bool
    {
        return (bool) apply_filters('f!windpress/integration/etch:enabled', Config::get(sprintf('integration.%s.enabled', $this->get_name()), \true));
    }
    public function register_provider(array $providers): array
    {
        $providers[] = ['id' => $this->get_name(), 'name' => __('Etch', 'windpress'), 'description' => __('Etch integration', 'windpress'), 'callback' => Config::get(sprintf('integration.%s.compile.enabled', $this->get_name()), \true) ? \WindPress\WindPress\Integration\Etch\Compile::class : static fn() => [], 'enabled' => $this->is_enabled(), 'type' => 'plugin', 'homepage' => 'https://etchwp.com?aff=bce0d1ab', 'is_installed_active' => static function () {
            $is = -1;
            $is += Common::is_plugin_installed('Etch') ? 1 : 0;
            $is += Common::is_plugin_active_by_name('Etch') ? 1 : 0;
            return $is;
        }];
        return $providers;
    }
    public function is_exclude_admin(bool $is_exclude_admin): bool
    {
        if ($is_exclude_admin) {
            return $is_exclude_admin;
        }
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- This is not a form submission
        return isset($_GET['etch']) && $_GET['etch'] === 'magic';
    }
    // public function is_prevent_load(bool $is_prevent_load): bool
    // {
    //     if ($is_prevent_load) {
    //         return $is_prevent_load;
    //     }
    //     // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- This is not a form submission
    //     return isset($_GET['etch']) && $_GET['etch'] === 'magic';
    // }
}
