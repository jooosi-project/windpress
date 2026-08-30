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
namespace WindPress\WindPress\Upgrade;

use Exception;
use WIND_PRESS;
use WindPress\WindPress\Core\Volume;
use WindPress\WindPress\Utils\Common;
/**
 * @since 3.0.0
 */
class UpgradeManager
{
    /**
     * Stores the instance, implementing a Singleton pattern.
     */
    private static self $instance;
    private const UPGRADE_OPTION_KEY = 'windpress_upgrade_state';
    private array $upgrades = ['3.3.51' => 'up_to_3_3_51'];
    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private function __construct()
    {
    }
    /**
     * Singletons should not be cloneable.
     */
    private function __clone()
    {
    }
    /**
     * Singletons should not be restorable from strings.
     *
     * @throws Exception Cannot unserialize a singleton.
     */
    public function __wakeup()
    {
        throw new Exception('Cannot unserialize a singleton.');
    }
    /**
     * This is the static method that controls the access to the singleton
     * instance. On the first run, it creates a singleton object and places it
     * into the static property. On subsequent runs, it returns the client existing
     * object stored in the static property.
     */
    public static function get_instance(): self
    {
        if (!isset(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    public function run(): void
    {
        // Store current version metadata for future upgrade tracking
        $this->store_version_metadata();
        $upgrade_state = $this->get_upgrade_state();
        $current_version = $this->get_current_version();
        foreach ($this->upgrades as $version => $method) {
            if ($this->should_run_upgrade($version, $upgrade_state, $current_version)) {
                try {
                    $this->{$method}();
                    $this->mark_upgrade_complete($version);
                } catch (Exception $e) {
                    error_log("WindPress Upgrade Error for version {$version}: " . $e->getMessage());
                    $this->mark_upgrade_failed($version, $e->getMessage());
                }
            }
        }
    }
    /**
     * Store version metadata for tracking upgrade scenarios.
     * This should be called during plugin activation and upgrades.
     */
    public function store_version_metadata(): void
    {
        $current_version = $this->get_current_version();
        $is_wp_org = $this->is_wp_org_installation();
        // Get the previously stored version to track upgrade scenarios
        $previous_version = get_option(WIND_PRESS::WP_OPTION . '_version', null);
        $previous_was_wp_org = get_option(WIND_PRESS::WP_OPTION . '_was_wp_org', null);
        // Store the previous version info before updating
        if ($previous_version && $previous_version !== $current_version) {
            update_option(WIND_PRESS::WP_OPTION . '_previous_version', $previous_version);
            update_option(WIND_PRESS::WP_OPTION . '_previous_was_wp_org', $previous_was_wp_org ?? \false);
        }
        // Update current version info
        update_option(WIND_PRESS::WP_OPTION . '_version', $current_version);
        update_option(WIND_PRESS::WP_OPTION . '_was_wp_org', $is_wp_org);
    }
    private function get_upgrade_state(): array
    {
        return get_option(self::UPGRADE_OPTION_KEY, []);
    }
    private function save_upgrade_state(array $state): void
    {
        update_option(self::UPGRADE_OPTION_KEY, $state);
    }
    private function get_current_version(): string
    {
        return WIND_PRESS::VERSION;
    }
    /**
     * Check if this is a WP.org installation (Free version).
     * WP.org versions have a minor version that is 1 lower than Pro versions.
     * 
     * @return bool True if installed from WP.org, false if Pro version
     */
    private function is_wp_org_installation(): bool
    {
        return !Common::is_updater_library_available();
    }
    /**
     * Get the previous version stored during plugin activation/upgrade.
     * This helps determine upgrade scenarios.
     * 
     * @return string|null Previous version or null if not available
     */
    private function get_previous_version(): ?string
    {
        return get_option(WIND_PRESS::WP_OPTION . '_previous_version', null);
    }
    /**
     * Check if the previous version was from WP.org.
     * This is determined by checking if the previous version metadata indicates WP.org origin.
     * 
     * @return bool True if previous version was from WP.org
     */
    private function was_previous_version_wp_org(): bool
    {
        return get_option(WIND_PRESS::WP_OPTION . '_previous_was_wp_org', \false);
    }
    private function should_run_upgrade(string $version, array $upgrade_state, string $current_version): bool
    {
        if (isset($upgrade_state[$version]) && $upgrade_state[$version]['status'] === 'completed') {
            return \false;
        }
        $is_wp_org = $this->is_wp_org_installation();
        $was_previous_wp_org = $this->was_previous_version_wp_org();
        // If current installation is from WP.org, we need to adjust the version comparison
        if ($is_wp_org) {
            // For WP.org installations, the current version has minor version - 1
            // So we need to compare against an adjusted target version
            $adjusted_version = $this->adjust_version_for_wp_org($version);
            return version_compare($current_version, $adjusted_version, '>=');
        }
        // If previous version was from WP.org but current is Pro, handle upgrade from WP.org to Pro
        if ($was_previous_wp_org && !$is_wp_org) {
            $previous_version = $this->get_previous_version();
            if ($previous_version) {
                // The previous WP.org version might have a lower minor version, so we need special handling
                $adjusted_previous = $this->adjust_version_from_wp_org($previous_version);
                return version_compare($adjusted_previous, $version, '<') && version_compare($current_version, $version, '>=');
            }
        }
        // Standard version comparison for Pro versions
        return version_compare($current_version, $version, '>=');
    }
    /**
     * Adjust a Pro version number to WP.org equivalent (minor version - 1).
     * Example: 3.3.50 -> 3.2.50
     * 
     * @param string $version Pro version
     * @return string WP.org equivalent version
     */
    private function adjust_version_for_wp_org(string $version): string
    {
        $parts = explode('.', $version);
        if (count($parts) >= 3) {
            $major = (int) $parts[0];
            $minor = (int) $parts[1];
            $patch = (int) $parts[2];
            // Decrease minor version by 1 for WP.org
            $wp_org_minor = max(0, $minor - 1);
            return "{$major}.{$wp_org_minor}.{$patch}";
        }
        return $version;
    }
    /**
     * Adjust a WP.org version number to Pro equivalent (minor version + 1).
     * Example: 3.2.50 -> 3.3.50
     * 
     * @param string $version WP.org version
     * @return string Pro equivalent version
     */
    private function adjust_version_from_wp_org(string $version): string
    {
        $parts = explode('.', $version);
        if (count($parts) >= 3) {
            $major = (int) $parts[0];
            $minor = (int) $parts[1];
            $patch = (int) $parts[2];
            // Increase minor version by 1 to get Pro equivalent
            $pro_minor = $minor + 1;
            return "{$major}.{$pro_minor}.{$patch}";
        }
        return $version;
    }
    private function mark_upgrade_complete(string $version): void
    {
        $upgrade_state = $this->get_upgrade_state();
        $upgrade_state[$version] = ['status' => 'completed', 'completed_at' => current_time('mysql')];
        $this->save_upgrade_state($upgrade_state);
    }
    private function mark_upgrade_failed(string $version, string $error_message): void
    {
        $upgrade_state = $this->get_upgrade_state();
        $upgrade_state[$version] = ['status' => 'failed', 'error' => $error_message, 'failed_at' => current_time('mysql')];
        $this->save_upgrade_state($upgrade_state);
    }
    public function reset_upgrade(string $version): bool
    {
        if (!isset($this->upgrades[$version])) {
            return \false;
        }
        $upgrade_state = $this->get_upgrade_state();
        unset($upgrade_state[$version]);
        $this->save_upgrade_state($upgrade_state);
        return \true;
    }
    public function get_upgrade_status(string $version): ?array
    {
        $upgrade_state = $this->get_upgrade_state();
        return $upgrade_state[$version] ?? null;
    }
    public function get_all_upgrade_statuses(): array
    {
        $upgrade_state = $this->get_upgrade_state();
        $result = [];
        foreach ($this->upgrades as $version => $method) {
            $result[$version] = ['method' => $method, 'status' => $upgrade_state[$version] ?? ['status' => 'pending']];
        }
        return $result;
    }
    /**
     * @version 3.3.51
     */
    public function up_to_3_3_51()
    {
        $entries = Volume::get_entries();
        // Introducing the Wizard feature - add wizard.css import to main.css
        $main_css_key = array_search('main.css', array_column($entries, 'name'), \true);
        if ($main_css_key !== \false) {
            $main_css_content = $entries[$main_css_key]['content'];
            // Check if wizard.css import is already present
            if (!preg_match('/@import\s+["\']\.\/wizard\.css["\'];/', $main_css_content)) {
                // Add the import at the end of the file
                $main_css_content .= "\n@import \"./wizard.css\";";
                $entries[$main_css_key]['content'] = $main_css_content;
                // Save the updated entries
                Volume::save_entries($entries);
            }
        }
    }
}
