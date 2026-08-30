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

use WIND_PRESS;
use WindPress\WindPress\Core\Runtime;
/**
 * Get Configuration Ability
 * 
 * Retrieves the current WindPress configuration including version, 
 * Tailwind version, and plugin settings.
 * 
 * @since 3.2.0
 */
class GetConfig
{
    /**
     * Execute the ability
     *
     * @return array Configuration data
     */
    public static function execute(): array
    {
        $settings = get_option(WIND_PRESS::WP_OPTION, []);
        return ['version' => WIND_PRESS::VERSION, 'tailwind_version' => Runtime::tailwindcss_version(), 'settings' => $settings, 'data_dir' => ['path' => wp_upload_dir()['basedir'] . WIND_PRESS::DATA_DIR, 'url' => wp_upload_dir()['baseurl'] . WIND_PRESS::DATA_DIR], 'cache_dir' => ['path' => wp_upload_dir()['basedir'] . WIND_PRESS::CACHE_DIR, 'url' => wp_upload_dir()['baseurl'] . WIND_PRESS::CACHE_DIR]];
    }
}
