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
namespace WindPress\WindPress\Utils;

use WindPressDeps\Nabasa\VitePlus\Assets;
use WIND_PRESS;
final class Vite
{
    private const SCOPE = 'windpress';
    private static ?Assets $assets = null;
    private function __construct()
    {
    }
    public static function assets(): Assets
    {
        if (self::$assets === null) {
            self::$assets = \WindPressDeps\Nabasa\VitePlus\assets(self::manifest_dir(), self::SCOPE);
        }
        return self::$assets;
    }
    public static function manifest(): object
    {
        return \WindPressDeps\Nabasa\VitePlus\get_manifest(self::manifest_dir(), self::SCOPE);
    }
    public static function manifest_dir(): string
    {
        return dirname(WIND_PRESS::FILE) . '/assets/dist';
    }
    public static function base_url(string $asset = ''): string
    {
        $url = self::assets()->url($asset);
        if ($asset === '') {
            return trailingslashit($url);
        }
        return $url;
    }
}
