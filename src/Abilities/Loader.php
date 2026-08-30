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
namespace WindPress\WindPress\Abilities;

use Exception;
/**
 * Abilities API Loader
 *
 * Registers WindPress abilities with the WordPress Abilities API.
 * Abilities provide a standardized way to expose plugin functionality
 * to AI agents, automation tools, and other developers.
 *
 * @since 3.2.0
 */
class Loader
{
    /**
     * Stores the instance, implementing a Singleton pattern.
     */
    private static self $instance;
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
    /**
     * Initialize the Abilities API integration
     *
     * This method checks if the Abilities API is available (WordPress 6.9+ or via composer package)
     * and registers the appropriate hooks for categories and abilities.
     */
    public function init(): void
    {
        // Check if Abilities API is available
        if (!function_exists('wp_register_ability_category') || !function_exists('wp_register_ability')) {
            return;
        }
        do_action('a!windpress/abilities/loader:init.start');
        // Register ability categories on the categories init hook
        add_action('wp_abilities_api_categories_init', fn() => $this->register_categories());
        // Register abilities on the abilities init hook
        add_action('wp_abilities_api_init', fn() => $this->register_abilities());
        do_action('a!windpress/abilities/loader:init.end');
    }
    /**
     * Register ability categories for WindPress
     */
    public function register_categories(): void
    {
        do_action('a!windpress/abilities/loader:register_categories.start');
        // Configuration category
        wp_register_ability_category('configuration', ['label' => __('Configuration', 'windpress'), 'description' => __('Abilities for retrieving and managing WindPress configuration.', 'windpress')]);
        // Volume Management category (Simple File System)
        wp_register_ability_category('volume-management', ['label' => __('Volume Management', 'windpress'), 'description' => __('Abilities for managing CSS/JS files in the WindPress Simple File System.', 'windpress')]);
        /**
         * Allow other plugins/themes to register additional ability categories.
         *
         * @since 3.2.0
         */
        do_action('a!windpress/abilities/loader:register_categories.end');
    }
    /**
     * Register all WindPress abilities
     */
    public function register_abilities(): void
    {
        do_action('a!windpress/abilities/loader:register_abilities.start');
        // Configuration
        $this->register_get_config();
        // Volume - Read operations
        $this->register_get_volume_entries();
        $this->register_get_volume_entry();
        $this->register_get_volume_handlers();
        // Volume - Write operations
        $this->register_save_volume_entries();
        $this->register_save_volume_entry();
        // Volume - Delete operations
        $this->register_delete_volume_entry();
        // Volume - Utility operations
        $this->register_reset_volume_entry();
        /**
         * Allow other plugins/themes to register additional abilities.
         *
         * @since 3.2.0
         */
        do_action('a!windpress/abilities/loader:register_abilities.end');
    }
    /**
     * Register the get-config ability
     */
    private function register_get_config(): void
    {
        wp_register_ability('windpress/get-config', ['label' => __('Get Configuration', 'windpress'), 'description' => __('Retrieves the current WindPress configuration including Tailwind version, plugin settings, and enabled features.', 'windpress'), 'category' => 'configuration', 'input_schema' => [], 'output_schema' => ['type' => 'object', 'properties' => ['version' => ['type' => 'string', 'description' => __('WindPress plugin version.', 'windpress')], 'tailwind_version' => ['type' => 'integer', 'description' => __('Tailwind CSS version (3 or 4).', 'windpress')], 'settings' => ['type' => 'object', 'description' => __('Plugin settings and configuration options.', 'windpress')], 'data_dir' => ['type' => 'object', 'description' => __('WindPress data directory details.', 'windpress'), 'properties' => ['path' => ['type' => 'string', 'description' => __('Absolute path to the WindPress data directory.', 'windpress')], 'url' => ['type' => 'string', 'description' => __('URL to the WindPress data directory.', 'windpress')]]], 'cache_dir' => ['type' => 'object', 'description' => __('WindPress cache directory details.', 'windpress'), 'properties' => ['path' => ['type' => 'string', 'description' => __('Absolute path to the WindPress cache directory.', 'windpress')], 'url' => ['type' => 'string', 'description' => __('URL to the WindPress cache directory.', 'windpress')]]]]], 'execute_callback' => [\WindPress\WindPress\Abilities\Abilities\GetConfig::class, 'execute'], 'permission_callback' => fn() => current_user_can('manage_options'), 'meta' => ['annotations' => ['readonly' => \true, 'destructive' => \false, 'idempotent' => \true], 'show_in_rest' => \true]]);
    }
    /**
     * Register the get-volume-entries ability
     */
    private function register_get_volume_entries(): void
    {
        wp_register_ability('windpress/get-volume-entries', ['label' => __('Get Volume Entries', 'windpress'), 'description' => __('Retrieves all files in the WindPress Simple File System including main.css, config files, and custom CSS/JS files.', 'windpress'), 'category' => 'volume-management', 'input_schema' => [], 'output_schema' => ['type' => 'array', 'items' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string', 'description' => __('File name.', 'windpress')], 'relative_path' => ['type' => 'string', 'description' => __('Relative path from data directory.', 'windpress')], 'content' => ['type' => 'string', 'description' => __('File content.', 'windpress')], 'handler' => ['type' => 'string', 'description' => __('Handler type (internal or custom).', 'windpress')], 'signature' => ['type' => 'string', 'description' => __('Security signature for file operations.', 'windpress')], 'readonly' => ['type' => 'boolean', 'description' => __('Whether the file is read-only.', 'windpress')]]]], 'execute_callback' => [\WindPress\WindPress\Abilities\Abilities\GetVolumeEntries::class, 'execute'], 'permission_callback' => fn() => current_user_can('manage_options'), 'meta' => ['annotations' => ['readonly' => \true, 'destructive' => \false, 'idempotent' => \true], 'show_in_rest' => \true]]);
    }
    /**
     * Register the get-volume-entry ability
     */
    private function register_get_volume_entry(): void
    {
        wp_register_ability('windpress/get-volume-entry', ['label' => __('Get Volume Entry', 'windpress'), 'description' => __('Retrieves a single file from the WindPress Simple File System by its relative path.', 'windpress'), 'category' => 'volume-management', 'input_schema' => ['type' => 'object', 'properties' => ['relative_path' => ['type' => 'string', 'description' => __('Relative path of the file to retrieve.', 'windpress')]], 'required' => ['relative_path']], 'output_schema' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string', 'description' => __('File name.', 'windpress')], 'relative_path' => ['type' => 'string', 'description' => __('Relative path from data directory.', 'windpress')], 'content' => ['type' => 'string', 'description' => __('File content.', 'windpress')], 'handler' => ['type' => 'string', 'description' => __('Handler type (internal or custom).', 'windpress')], 'signature' => ['type' => 'string', 'description' => __('Security signature for file operations.', 'windpress')], 'readonly' => ['type' => 'boolean', 'description' => __('Whether the file is read-only.', 'windpress')]]], 'execute_callback' => [\WindPress\WindPress\Abilities\Abilities\GetVolumeEntry::class, 'execute'], 'permission_callback' => fn() => current_user_can('manage_options'), 'meta' => ['annotations' => ['readonly' => \true, 'destructive' => \false, 'idempotent' => \true], 'show_in_rest' => \true]]);
    }
    /**
     * Register the get-volume-handlers ability
     */
    private function register_get_volume_handlers(): void
    {
        wp_register_ability('windpress/get-volume-handlers', ['label' => __('Get Volume Handlers', 'windpress'), 'description' => __('Retrieves available custom handlers for the WindPress Simple File System.', 'windpress'), 'category' => 'volume-management', 'input_schema' => [], 'output_schema' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => __('Array of available handler names.', 'windpress')], 'execute_callback' => [\WindPress\WindPress\Abilities\Abilities\GetVolumeHandlers::class, 'execute'], 'permission_callback' => fn() => current_user_can('manage_options'), 'meta' => ['annotations' => ['readonly' => \true, 'destructive' => \false, 'idempotent' => \true], 'show_in_rest' => \true]]);
    }
    /**
     * Register the save-volume-entries ability
     */
    private function register_save_volume_entries(): void
    {
        wp_register_ability('windpress/save-volume-entries', ['label' => __('Save Volume Entries', 'windpress'), 'description' => __('Saves or updates multiple files in the WindPress Simple File System at once.', 'windpress'), 'category' => 'volume-management', 'input_schema' => ['type' => 'object', 'properties' => ['entries' => ['type' => 'array', 'items' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string', 'description' => __('File name.', 'windpress')], 'relative_path' => ['type' => 'string', 'description' => __('Relative path from data directory.', 'windpress')], 'content' => ['type' => 'string', 'minLength' => 1, 'description' => __('File content.', 'windpress')], 'handler' => ['type' => 'string', 'description' => __('Handler type (internal or custom).', 'windpress')], 'signature' => ['type' => 'string', 'description' => __('Security signature for existing files.', 'windpress')]], 'required' => ['name', 'relative_path', 'content', 'handler']]]], 'required' => ['entries']], 'output_schema' => ['type' => 'object', 'properties' => ['success' => ['type' => 'boolean', 'description' => __('Whether the operation was successful.', 'windpress')], 'message' => ['type' => 'string', 'description' => __('Result message.', 'windpress')]]], 'execute_callback' => [\WindPress\WindPress\Abilities\Abilities\SaveVolumeEntries::class, 'execute'], 'permission_callback' => fn() => current_user_can('manage_options'), 'meta' => ['annotations' => ['readonly' => \false, 'destructive' => \true, 'idempotent' => \false], 'show_in_rest' => \true]]);
    }
    /**
     * Register the save-volume-entry ability
     */
    private function register_save_volume_entry(): void
    {
        wp_register_ability('windpress/save-volume-entry', ['label' => __('Save Volume Entry', 'windpress'), 'description' => __('Saves or updates a single file in the WindPress Simple File System.', 'windpress'), 'category' => 'volume-management', 'input_schema' => ['type' => 'object', 'properties' => ['name' => ['type' => 'string', 'description' => __('File name.', 'windpress')], 'relative_path' => ['type' => 'string', 'description' => __('Relative path from data directory.', 'windpress')], 'content' => ['type' => 'string', 'minLength' => 1, 'description' => __('File content.', 'windpress')], 'handler' => ['type' => 'string', 'description' => __('Handler type (internal or custom).', 'windpress'), 'default' => 'internal'], 'signature' => ['type' => 'string', 'description' => __('Security signature for existing files.', 'windpress')]], 'required' => ['name', 'relative_path', 'content']], 'output_schema' => ['type' => 'object', 'properties' => ['success' => ['type' => 'boolean', 'description' => __('Whether the operation was successful.', 'windpress')], 'message' => ['type' => 'string', 'description' => __('Result message.', 'windpress')], 'entry' => ['type' => 'object', 'description' => __('The saved entry data.', 'windpress')]]], 'execute_callback' => [\WindPress\WindPress\Abilities\Abilities\SaveVolumeEntry::class, 'execute'], 'permission_callback' => fn() => current_user_can('manage_options'), 'meta' => ['annotations' => ['readonly' => \false, 'destructive' => \true, 'idempotent' => \false], 'show_in_rest' => \true]]);
    }
    /**
     * Register the delete-volume-entry ability
     */
    private function register_delete_volume_entry(): void
    {
        wp_register_ability('windpress/delete-volume-entry', ['label' => __('Delete Volume Entry', 'windpress'), 'description' => __('Deletes a file from the WindPress Simple File System.', 'windpress'), 'category' => 'volume-management', 'input_schema' => ['type' => 'object', 'properties' => ['relative_path' => ['type' => 'string', 'description' => __('Relative path of the file to delete.', 'windpress')], 'signature' => ['type' => 'string', 'description' => __('Security signature for verification.', 'windpress')]], 'required' => ['relative_path', 'signature']], 'output_schema' => ['type' => 'object', 'properties' => ['success' => ['type' => 'boolean', 'description' => __('Whether the operation was successful.', 'windpress')], 'message' => ['type' => 'string', 'description' => __('Result message.', 'windpress')]]], 'execute_callback' => [\WindPress\WindPress\Abilities\Abilities\DeleteVolumeEntry::class, 'execute'], 'permission_callback' => fn() => current_user_can('manage_options'), 'meta' => ['annotations' => ['readonly' => \false, 'destructive' => \true, 'idempotent' => \true], 'show_in_rest' => \true]]);
    }
    /**
     * Register the reset-volume-entry ability
     */
    private function register_reset_volume_entry(): void
    {
        wp_register_ability('windpress/reset-volume-entry', ['label' => __('Reset Volume Entry', 'windpress'), 'description' => __('Resets main.css or tailwind.config.js to their default content based on the current Tailwind version.', 'windpress'), 'category' => 'volume-management', 'input_schema' => ['type' => 'object', 'properties' => ['relative_path' => ['type' => 'string', 'enum' => ['main.css', 'tailwind.config.js', 'wizard.js', 'wizard.css'], 'description' => __('File to reset (main.css, tailwind.config.js, wizard.js, or wizard.css).', 'windpress')]], 'required' => ['relative_path']], 'output_schema' => ['type' => 'object', 'properties' => ['success' => ['type' => 'boolean', 'description' => __('Whether the operation was successful.', 'windpress')], 'message' => ['type' => 'string', 'description' => __('Result message.', 'windpress')], 'content' => ['type' => 'string', 'description' => __('The default file content.', 'windpress')]]], 'execute_callback' => [\WindPress\WindPress\Abilities\Abilities\ResetVolumeEntry::class, 'execute'], 'permission_callback' => fn() => current_user_can('manage_options'), 'meta' => ['annotations' => ['readonly' => \false, 'destructive' => \true, 'idempotent' => \true], 'show_in_rest' => \true]]);
    }
}
