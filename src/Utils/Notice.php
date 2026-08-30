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

use WIND_PRESS;
/**
 * Manage the plugin's notices for the wp-admin page.
 *
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Notice
{
    /**
     * @var string
     */
    public const ERROR = 'error';
    /**
     * @var string
     */
    public const SUCCESS = 'success';
    /**
     * @var string
     */
    public const WARNING = 'warning';
    /**
     * @var string
     */
    public const INFO = 'info';
    /**
     * @var string
     */
    public const OPTION_NAME = WIND_PRESS::WP_OPTION . '_notices';
    /**
     * Get lists of notices.
     */
    public static function get_lists(?bool $purge = \true): array
    {
        $notices = get_option(self::OPTION_NAME, []);
        if ($purge) {
            update_option(self::OPTION_NAME, []);
        }
        return $notices;
    }
    /**
     * Callback for the admin_notices action.
     * Prints the notices in the admin page.
     */
    public static function admin_notices(): void
    {
        $messages = self::get_lists();
        if ($messages && is_array($messages)) {
            foreach ($messages as $message) {
                echo sprintf('<div class="notice notice-%s is-dismissible %s">%s</div>', esc_attr($message['status']), esc_attr(self::OPTION_NAME), wp_kses_post($message['message']));
            }
        }
    }
    public static function add(string $status, string $message, ?string $key = null, bool $unique = \false): void
    {
        $notices = get_option(self::OPTION_NAME, []);
        $payload = ['status' => $status, 'message' => $message];
        if ($unique) {
            if ($key && isset($notices[$key])) {
                return;
            }
            if (in_array(['status' => $status, 'message' => $message], $notices, \true)) {
                return;
            }
        }
        if ($key) {
            $notices[$key] = $payload;
        } else {
            $notices[] = $payload;
        }
        update_option(self::OPTION_NAME, $notices);
    }
    /**
     * Add bulk notices.
     *
     * @param string|array $messages a message or an array of messages to add.
     */
    public static function adds(string $status, $messages): void
    {
        if (!is_array($messages)) {
            $messages = [$messages];
        }
        foreach ($messages as $message) {
            if (!is_array($message)) {
                self::add($status, $message);
            } else {
                self::add($status, ...$message);
            }
        }
    }
    public static function success(string $message, ?string $key = null, bool $unique = \false): void
    {
        self::add(self::SUCCESS, ...func_get_args());
    }
    public static function warning(string $message, ?string $key = null, bool $unique = \false): void
    {
        self::add(self::WARNING, ...func_get_args());
    }
    public static function info(string $message, ?string $key = null, bool $unique = \false): void
    {
        self::add(self::INFO, ...func_get_args());
    }
    public static function error(string $message, ?string $key = null, bool $unique = \false): void
    {
        self::add(self::ERROR, ...func_get_args());
    }
}
