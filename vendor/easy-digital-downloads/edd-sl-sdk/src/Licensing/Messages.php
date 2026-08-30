<?php

/**
 * License status message class.
 *
 * @since 1.0.0
 *
 * @package EasyDigitalDownloads\Updater\Licensing\Messages
 * @copyright (c) 2025, Sandhills Development, LLC
 * @license http://opensource.org/licenses/gpl-2.0.php GNU Public License
 * @since 1.0.0
 */
namespace EasyDigitalDownloads\Updater\Licensing;

// Exit if accessed directly.
defined('ABSPATH') || exit;
/**
 * License status message class.
 *
 * @since 1.0.0
 */
class Messages
{
    use \EasyDigitalDownloads\Updater\Traits\Messenger;
    /**
     * The array of license data.
     *
     * @var array
     */
    private $license_data = array();
    /**
     * The license expiration as a timestamp, or false if no expiration.
     *
     * @var bool|int
     */
    private $expiration = \false;
    /**
     * The current timestamp.
     *
     * @var int
     */
    private $now;
    /**
     * Constructor.
     *
     * @since 1.0.0
     * @param array                                        $license_data The license data.
     * @param \EasyDigitalDownloads\Updater\Messenger|null $messenger    Optional; the messenger instance for translations.
     */
    public function __construct($license_data = array(), $messenger = null)
    {
        $this->license_data = wp_parse_args($license_data, array('status' => '', 'expires' => '', 'name' => '', 'license_key' => ''));
        $this->now = current_time('timestamp');
        if (!empty($this->license_data['expires']) && 'lifetime' !== $this->license_data['expires']) {
            if (!is_numeric($this->license_data['expires'])) {
                $this->expiration = strtotime($this->license_data['expires'], $this->now);
            } else {
                $this->expiration = $this->license_data['expires'];
            }
        }
        // Set messenger instance, falling back to default if not provided.
        $this->messenger = $this->get_messenger($messenger);
    }
    /**
     * Gets the appropriate licensing message from an array of license data.
     *
     * @since 1.0.0
     * @return string
     */
    public function get_message()
    {
        return $this->build_message();
    }
    /**
     * Builds the message based on the license data.
     *
     * @sinc 1.0.0
     * @return string
     */
    private function build_message()
    {
        switch ($this->license_data['status']) {
            case 'expired':
                $message = $this->messenger->get_license_expired_message($this->get_date($this->expiration));
                break;
            case 'revoked':
            case 'disabled':
                $message = $this->messenger->get_license_disabled_message();
                break;
            case 'missing':
                $message = $this->messenger->get_license_missing_message();
                break;
            case 'site_inactive':
                $message = $this->messenger->get_license_site_inactive_message();
                break;
            case 'invalid':
            case 'invalid_item_id':
            case 'item_name_mismatch':
            case 'key_mismatch':
                if (!empty($this->license_data['name'])) {
                    $message = $this->messenger->get_license_invalid_for_item_message($this->license_data['name']);
                } else {
                    $message = $this->messenger->get_license_invalid_message();
                }
                break;
            case 'no_activations_left':
                $message = $this->messenger->get_license_no_activations_message();
                break;
            case 'license_not_activable':
                $message = $this->messenger->get_license_bundle_message();
                break;
            case 'deactivated':
                $message = $this->messenger->get_license_deactivated_message();
                break;
            case 'valid':
                $message = $this->get_valid_message();
                break;
            default:
                $message = $this->messenger->get_license_unlicensed_message();
                break;
        }
        return $message;
    }
    /**
     * Gets the message text for a valid license.
     *
     * @since 1.0.0
     * @return string
     */
    private function get_valid_message()
    {
        if (!empty($this->license_data['expires']) && 'lifetime' === $this->license_data['expires']) {
            return $this->messenger->get_license_lifetime_message();
        }
        if ($this->expiration > $this->now && $this->expiration - $this->now < \DAY_IN_SECONDS * 30) {
            return $this->messenger->get_license_expires_soon_message($this->get_date($this->expiration));
        }
        return $this->messenger->get_license_expires_message($this->get_date($this->expiration));
    }
    /**
     * Gets a date in the current locale.
     *
     * @since 1.0.1
     * @param int $timestamp The timestamp to format.
     * @return string
     */
    private function get_date($timestamp)
    {
        if (is_numeric($timestamp)) {
            return date_i18n(get_option('date_format'), $timestamp);
        }
        return $this->messenger->get_unknown_date_message();
    }
}
