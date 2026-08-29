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

namespace WindPress\WindPress\Licensing;

use EasyDigitalDownloads\Updater\Licensing\License;
use EasyDigitalDownloads\Updater\Messenger;
use EasyDigitalDownloads\Updater\Requests\API;
use EasyDigitalDownloads\Updater\Updaters\Plugin as PluginUpdater;
use WIND_PRESS;
use WP_Error;

/**
 * Bridges WindPress's existing license UI to the official EDD Software
 * Licensing SDK and initializes its WordPress plugin updater.
 */
final class Manager
{
    public const INTEGRATION_ID = 'windpress';

    public const OPTION_NAME = 'windpress_license_key';

    private const MIGRATION_OPTION = 'windpress_edd_sl_sdk_migrated';

    private License $license;

    public function __construct()
    {
        $this->license = new License(
            self::INTEGRATION_ID,
            self::get_integration_args(),
            new Messenger()
        );

        $this->migrate_legacy_license();
    }

    /**
     * Arguments shared by the SDK registry and the compatibility bridge.
     *
     * @return array<string, mixed>
     */
    public static function get_integration_args(): array
    {
        return [
            'id' => self::INTEGRATION_ID,
            'url' => WIND_PRESS::EDD_STORE['store_url'],
            'item_id' => WIND_PRESS::EDD_STORE['item_id'],
            'version' => WIND_PRESS::VERSION,
            'file' => WIND_PRESS::FILE,
            'option_name' => self::OPTION_NAME,
            'weekly_check' => true,
        ];
    }

    /**
     * Initialize the official updater with WindPress's pre-release behavior
     * and WordPress.org override preserved.
     */
    public function boot_updater(): void
    {
        if (! current_user_can('manage_options') && ! wp_doing_cron()) {
            return;
        }

        $license_key = $this->get_license_key();

        if ($license_key === '') {
            return;
        }

        new PluginUpdater(
            WIND_PRESS::EDD_STORE['store_url'],
            [
                'file' => WIND_PRESS::FILE,
                'item_id' => WIND_PRESS::EDD_STORE['item_id'],
                'version' => WIND_PRESS::VERSION,
                'license' => $license_key,
                'beta' => $this->is_pre_release_enabled(),
                'allow_tracking' => $this->license->get_allow_tracking(),
                'wp_override' => true,
            ],
            new Messenger()
        );
    }

    public function get_license_key(): string
    {
        return trim((string) $this->license->get_license_key());
    }

    public function is_activated(): bool
    {
        if ($this->get_license_key() === '') {
            return false;
        }

        $status = get_option($this->license->get_status_option_name());

        return is_object($status)
            && ($status->success ?? true) !== false
            && in_array($status->license ?? '', ['active', 'valid'], true);
    }

    /**
     * Activate and persist a license using the official SDK request client.
     *
     * @return object|WP_Error
     */
    public function activate(string $license_key)
    {
        $license_key = trim($license_key);

        if ($license_key === '') {
            return new WP_Error(
                'missing',
                __('Enter a license key.', 'windpress')
            );
        }

        $old_license_key = $this->get_license_key();
        $license_data = $this->request('activate_license', $license_key);

        if (is_wp_error($license_data)) {
            return $license_data;
        }

        update_option(self::OPTION_NAME, $license_key);
        $this->license->save($license_data);
        $this->clear_cache([$old_license_key, $license_key]);

        return $license_data;
    }

    /**
     * Deactivate and remove the currently stored license.
     *
     * @return object|WP_Error
     */
    public function deactivate()
    {
        $license_key = $this->get_license_key();

        if ($license_key === '') {
            delete_option($this->license->get_status_option_name());

            return (object) [
                'success' => true,
                'license' => 'inactive',
            ];
        }

        $license_data = $this->request('deactivate_license', $license_key);

        if (is_wp_error($license_data)) {
            return $license_data;
        }

        delete_option(self::OPTION_NAME);
        delete_option($this->license->get_status_option_name());
        $this->clear_cache([$license_key]);

        return $license_data;
    }

    /**
     * Clear update data after activation, deactivation, or plugin activation.
     *
     * @param array<int, string>|null $license_keys
     */
    public function clear_cache(?array $license_keys = null): void
    {
        $license_keys = $license_keys ?? [$this->get_license_key()];
        $slug = basename(dirname(WIND_PRESS::FILE));
        $beta = (int) $this->is_pre_release_enabled();

        foreach (array_unique($license_keys) as $license_key) {
            $cache_keys = [
                // Official EDD SDK cache key.
                md5(wp_json_encode([$slug, $license_key, $beta])),
                // Rosua updater cache key used by previous WindPress releases.
                md5(serialize($slug . $license_key . $beta)),
            ];

            foreach (array_unique($cache_keys) as $cache_key) {
                delete_option('edd_sl_' . $cache_key);
            }
        }

        delete_transient(WIND_PRESS::WP_OPTION . '_license_seed');
        delete_site_transient('update_plugins');
    }

    public function error_message(string $code): string
    {
        switch ($code) {
            case 'expired':
                return __('Your license key has expired.', 'windpress');
            case 'disabled':
            case 'revoked':
                return __('Your license key has been disabled.', 'windpress');
            case 'inactive':
            case 'site_inactive':
                return __('Your license is not active for this website.', 'windpress');
            case 'no_activations_left':
                return __('Your license key has reached its activation limit.', 'windpress');
            case 'missing_url':
                return __('The license does not exist or the website URL was not provided.', 'windpress');
            case 'key_mismatch':
            case 'missing':
            case 'invalid':
            case 'invalid_item_id':
            case 'item_name_mismatch':
                return __('Invalid license key.', 'windpress');
            default:
                return __('The license server rejected the request.', 'windpress');
        }
    }

    /**
     * @return object|WP_Error
     */
    private function request(string $action, string $license_key)
    {
        $api = new API(WIND_PRESS::EDD_STORE['store_url']);
        $license_data = $api->make_request([
            'edd_action' => $action,
            'license' => $license_key,
            'item_id' => WIND_PRESS::EDD_STORE['item_id'],
        ]);

        if (! is_object($license_data)) {
            return new WP_Error(
                'license_server_unavailable',
                __('The license server could not be reached.', 'windpress')
            );
        }

        if (empty($license_data->success)) {
            $code = (string) ($license_data->error ?? $license_data->license ?? 'invalid');

            return new WP_Error($code, $this->error_message($code));
        }

        return $license_data;
    }

    private function is_pre_release_enabled(): bool
    {
        $legacy_license = get_option(WIND_PRESS::WP_OPTION . '_license', []);

        return is_array($legacy_license) && ! empty($legacy_license['opt_in_pre_release']);
    }

    /**
     * Copy license data from the Rosua updater options without changing or
     * deleting them, so upgraded installations keep their activation state.
     */
    private function migrate_legacy_license(): void
    {
        if (get_option(self::MIGRATION_OPTION, false)) {
            return;
        }

        $missing = new \stdClass();
        $license_key = get_option(self::OPTION_NAME, $missing);

        if ($license_key === $missing || trim((string) $license_key) === '') {
            $legacy_license = get_option(WIND_PRESS::WP_OPTION . '_license', []);
            $legacy_key = is_array($legacy_license) ? trim((string) ($legacy_license['key'] ?? '')) : '';

            if ($legacy_key !== '') {
                update_option(self::OPTION_NAME, $legacy_key);
            }
        }

        if (get_option($this->license->get_status_option_name(), $missing) === $missing) {
            $legacy_status = get_transient(WIND_PRESS::WP_OPTION . '_license_seed');

            if (is_object($legacy_status) && ! empty($legacy_status->license)) {
                $this->license->save($legacy_status);
            }
        }

        update_option(self::MIGRATION_OPTION, true);
    }
}
