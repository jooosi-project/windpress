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

use WindPressDeps\Symfony\Component\Stopwatch\Stopwatch;
use Throwable;
/**
 * Debug tools for the plugin.
 *
 * @since 3.0.0
 */
class Debug
{
    /**
     * The stopwatch instance.
     */
    private static Stopwatch $stopwatch;
    /**
     * Get the stopwatch instance.
     */
    public static function stopwatch(): Stopwatch
    {
        if (!isset(self::$stopwatch)) {
            self::$stopwatch = new Stopwatch(\true);
        }
        return self::$stopwatch;
    }
    public static function shutdown()
    {
        if (isset(self::$stopwatch)) {
            // self::shutdown_stopwatch();
        }
    }
    public static function shutdown_stopwatch()
    {
        $stopwatchEvent = self::stopwatch()->getSectionEvents('__root__');
        if ($stopwatchEvent === []) {
            return;
        }
        $log = '=== ' . gmdate('Y-m-d H:i:s', time()) . ' ===' . \PHP_EOL;
        foreach ($stopwatchEvent as $ev) {
            $log .= (string) $ev . \PHP_EOL;
        }
        $log .= \PHP_EOL;
        $path = wp_upload_dir()['basedir'] . '/windpress/debug/stopwatch.log';
        try {
            \WindPress\WindPress\Utils\Common::save_file($log, $path, \FILE_APPEND);
        } catch (Throwable $throwable) {
        }
    }
}
