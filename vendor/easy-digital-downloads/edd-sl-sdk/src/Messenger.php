<?php

/**
 * Messenger class for translatable strings.
 *
 * This class provides all user-facing messages used throughout the SDK.
 * Plugin and theme developers can extend this class to provide their own
 * translations with their own text domains.
 *
 * @since 1.0.1
 *
 * @package EasyDigitalDownloads\Updater
 * @copyright (c) 2025, Sandhills Development, LLC
 * @license http://opensource.org/licenses/gpl-2.0.php GNU Public License
 */
namespace EasyDigitalDownloads\Updater;

// Exit if accessed directly.
defined('ABSPATH') || exit;
/**
 * Messenger class.
 *
 * @since 1.0.1
 */
class Messenger
{
    /**
     * The text domain to use for translations.
     *
     * @since 1.0.1
     * @var string
     */
    protected $text_domain = 'edd-sl-sdk';
    /**
     * Gets the text domain.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_text_domain(): string
    {
        return $this->text_domain;
    }
    // ==========================================================================
    // License Status Messages
    // ==========================================================================
    /**
     * Gets the message for an expired license.
     *
     * @since 1.0.1
     * @param string $date The expiration date.
     * @return string
     */
    public function get_license_expired_message(string $date): string
    {
        $message = sprintf(
            /* translators: %s: license expiration date. */
            __('Your license key expired on %s. Please renew your license key.', $this->text_domain),
            // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
            $date
        );
        return $this->filter_string($message, 'license_expired');
    }
    /**
     * Gets the message for a disabled/revoked license.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_license_disabled_message(): string
    {
        $message = __('Your license key has been disabled.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'license_disabled');
    }
    /**
     * Gets the message for a missing license.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_license_missing_message(): string
    {
        $message = __('Invalid license. Please verify it.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'license_missing');
    }
    /**
     * Gets the message for an inactive site.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_license_site_inactive_message(): string
    {
        $message = __('Your license key is not active for this URL.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'license_site_inactive');
    }
    /**
     * Gets the message for an invalid license with item name.
     *
     * @since 1.0.1
     * @param string $item_name The item name.
     * @return string
     */
    public function get_license_invalid_for_item_message(string $item_name): string
    {
        $message = sprintf(
            /* translators: %s: the extension name. */
            __('This appears to be an invalid license key for %s.', $this->text_domain),
            // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
            $item_name
        );
        return $this->filter_string($message, 'license_invalid_for_item');
    }
    /**
     * Gets the message for an invalid license.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_license_invalid_message(): string
    {
        $message = __('This appears to be an invalid license key.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'license_invalid');
    }
    /**
     * Gets the message for no activations left.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_license_no_activations_message(): string
    {
        $message = __('Your license key has reached its activation limit.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'license_no_activations');
    }
    /**
     * Gets the message for a bundle license.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_license_bundle_message(): string
    {
        $message = __('The key you entered belongs to a bundle, please use the product specific license key.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'license_bundle');
    }
    /**
     * Gets the message for a deactivated license.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_license_deactivated_message(): string
    {
        $message = __('Your license key has been deactivated.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'license_deactivated');
    }
    /**
     * Gets the message for an unlicensed product.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_license_unlicensed_message(): string
    {
        $message = __('Unlicensed: currently not receiving updates.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'license_unlicensed');
    }
    /**
     * Gets the message for a lifetime license.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_license_lifetime_message(): string
    {
        $message = __('License key never expires.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'license_lifetime');
    }
    /**
     * Gets the message for a license expiring soon.
     *
     * @since 1.0.1
     * @param string $date The expiration date.
     * @return string
     */
    public function get_license_expires_soon_message(string $date): string
    {
        $message = sprintf(
            /* translators: %s: the license expiration date. */
            __('Your license key expires soon! It expires on %s.', $this->text_domain),
            // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
            $date
        );
        return $this->filter_string($message, 'license_expires_soon');
    }
    /**
     * Gets the message for a valid license.
     *
     * @since 1.0.1
     * @param string $date The expiration date.
     * @return string
     */
    public function get_license_expires_message(string $date): string
    {
        $message = sprintf(
            /* translators: %s: the license expiration date. */
            __('Your license key expires on %s.', $this->text_domain),
            // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
            $date
        );
        return $this->filter_string($message, 'license_expires');
    }
    /**
     * Gets the message for an unknown date.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_unknown_date_message(): string
    {
        $message = __('Unknown date', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'unknown_date');
    }
    // ==========================================================================
    // Action Button Labels
    // ==========================================================================
    /**
     * Gets the label for the Activate button.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_activate_button_label(): string
    {
        $label = __('Activate', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($label, 'activate_button');
    }
    /**
     * Gets the label for the Deactivate button.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_deactivate_button_label(): string
    {
        $label = __('Deactivate', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($label, 'deactivate_button');
    }
    /**
     * Gets the label for the Delete button.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_delete_button_label(): string
    {
        $label = __('Delete', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($label, 'delete_button');
    }
    // ==========================================================================
    // AJAX Response Messages
    // ==========================================================================
    /**
     * Gets the permission denied message.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_permission_denied_message(): string
    {
        $message = __('You do not have permission to manage this license.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'permission_denied');
    }
    /**
     * Gets the permission denied message for settings.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_permission_denied_setting_message(): string
    {
        $message = __('You do not have permission to manage this setting.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'permission_denied_setting');
    }
    /**
     * Gets the activation error message.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_activation_error_message(): string
    {
        $message = __('There was an error activating your license. Please try again.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'activation_error');
    }
    /**
     * Gets the activation success message.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_activation_success_message(): string
    {
        $message = __('Your license was successfully activated.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'activation_success');
    }
    /**
     * Gets the deactivation error message.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_deactivation_error_message(): string
    {
        $message = __('There was an error deactivating your license. Please try again.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'deactivation_error');
    }
    /**
     * Gets the deactivation success message.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_deactivation_success_message(): string
    {
        $message = __('Your license was successfully deactivated.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'deactivation_success');
    }
    /**
     * Gets the deletion success message.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_deletion_success_message(): string
    {
        $message = __('Your license was successfully deleted.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'deletion_success');
    }
    /**
     * Gets the tracking enabled message.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_tracking_enabled_message(): string
    {
        $message = __('Data tracking has been enabled.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'tracking_enabled');
    }
    /**
     * Gets the tracking disabled message.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_tracking_disabled_message(): string
    {
        $message = __('Data tracking has been disabled.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'tracking_disabled');
    }
    // ==========================================================================
    // JavaScript Localization
    // ==========================================================================
    /**
     * Gets the activating text for JavaScript.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_activating_text(): string
    {
        $text = __('Activating...', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($text, 'activating_text');
    }
    /**
     * Gets the deactivating text for JavaScript.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_deactivating_text(): string
    {
        $text = __('Deactivating...', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($text, 'deactivating_text');
    }
    /**
     * Gets the unknown error text for JavaScript.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_unknown_error_text(): string
    {
        $text = __('An unknown error occurred.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($text, 'unknown_error_text');
    }
    /**
     * Gets the dismiss notice screen reader text.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_dismiss_notice_text(): string
    {
        $text = __('Dismiss notice', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($text, 'dismiss_notice');
    }
    // ==========================================================================
    // UI Labels
    // ==========================================================================
    /**
     * Gets the license key label for a specific item.
     *
     * @since 1.0.1
     * @param string $name The item name.
     * @return string
     */
    public function get_license_key_label(string $name): string
    {
        $label = sprintf(
            /* translators: %s: item name */
            __('License key for %s:', $this->text_domain),
            // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
            $name
        );
        return $this->filter_string($label, 'license_key_label');
    }
    /**
     * Gets the data tracking checkbox label.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_data_tracking_label(): string
    {
        $label = __('Allow the licensing API to collect usage data about your site, such as the PHP and WordPress versions.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($label, 'data_tracking_label');
    }
    /**
     * Gets the menu label for managing theme license.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_theme_license_menu_label(): string
    {
        $label = __('Theme License', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($label, 'theme_license_menu');
    }
    /**
     * Gets the link label for managing plugin license.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_manage_license_link_label(): string
    {
        $label = __('Manage License', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($label, 'manage_license_link');
    }
    // ==========================================================================
    // Update Notification Messages
    // ==========================================================================
    /**
     * Gets the new version available message for plugins.
     *
     * @since 1.0.1
     * @param string $plugin_name The plugin name.
     * @return string
     */
    public function get_new_version_available_message(string $plugin_name): string
    {
        $message = sprintf(
            /* translators: %s: plugin name */
            __('There is a new version of %s available.', $this->text_domain),
            // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
            $plugin_name
        );
        return $this->filter_string($message, 'new_version_available');
    }
    /**
     * Gets the contact administrator message for multisite.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_contact_admin_message(): string
    {
        $message = __('Contact your network administrator to install the update.', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($message, 'contact_admin');
    }
    /**
     * Gets the view details link text.
     *
     * @since 1.0.1
     * @param string $version The version number.
     * @return string
     */
    public function get_view_details_link(string $version): string
    {
        $text = sprintf(
            /* translators: %s: version number */
            __('View version %s details', $this->text_domain),
            // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
            $version
        );
        return $this->filter_string($text, 'view_details_link');
    }
    /**
     * Gets the update now text.
     *
     * @since 1.0.1
     * @return string
     */
    public function get_update_now_text(): string
    {
        $text = __('Update now', $this->text_domain);
        // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
        return $this->filter_string($text, 'update_now');
    }
    /**
     * Gets the view details or update link text.
     *
     * @since 1.0.1
     * @param string $new_version The new plugin version.
     * @param string $changelog_link The changelog link.
     * @param string $update_link The update link.
     * @param string $file The file.
     * @return string
     */
    public function get_view_details_or_update_link(string $new_version, string $changelog_link, string $update_link, string $file): string
    {
        return $this->filter_string(sprintf(
            /* translators: 1. opening anchor tag, do not translate 2. the new plugin version 3. closing anchor tag, do not translate 4. opening anchor tag, do not translate 5. closing anchor tag, do not translate */
            __('%1$sView version %2$s details%3$s or %4$supdate now%5$s.', $this->text_domain),
            // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralDomain
            '<a target="_blank" class="thickbox open-plugin-details-modal" href="' . esc_url($changelog_link) . '">',
            esc_html($new_version),
            '</a>',
            '<a target="_blank" class="update-link" href="' . esc_url(wp_nonce_url($update_link, 'upgrade-plugin_' . $file)) . '">',
            '</a>'
        ), 'view_details_or_update_link');
    }
    /**
     * Applies the translation filter to a string.
     *
     * @since 1.0.1
     * @param string $text_string The translated string.
     * @param string $key         The string key/identifier.
     * @return string
     */
    protected function filter_string(string $text_string, string $key): string
    {
        /**
         * Filters a translated string.
         *
         * @since 1.0.1
         * @param string $text_string The translated string.
         * @param string $key         The string key/identifier.
         * @param string $text_domain The text domain being used.
         */
        return apply_filters('edd_sl_sdk_translate_string', $text_string, $key, $this->text_domain);
    }
}
