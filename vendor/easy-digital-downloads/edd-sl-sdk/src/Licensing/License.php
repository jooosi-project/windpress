<?php

/**
 * License class.
 *
 * @since 1.0.0
 *
 * @package EasyDigitalDownloads\Updater\Licensing\License
 * @copyright (c) 2025, Sandhills Development, LLC
 * @license http://opensource.org/licenses/gpl-2.0.php GNU Public License
 * @since 1.0.0
 */
namespace EasyDigitalDownloads\Updater\Licensing;

// Exit if accessed directly.
defined('ABSPATH') || exit;
/**
 * License class.
 *
 * @since 1.0.0
 */
class License
{
    use \EasyDigitalDownloads\Updater\Traits\Messenger;
    /**
     * The slug.
     *
     * @var string
     */
    private $slug;
    /**
     * The arguments.
     *
     * @var array
     */
    private $args;
    /**
     * The class constructor.
     *
     * @since 1.0.0
     * @param string                                       $slug      The slug.
     * @param array                                        $args      The arguments.
     * @param \EasyDigitalDownloads\Updater\Messenger|null $messenger Optional; the messenger instance for translations.
     */
    public function __construct($slug, $args, $messenger = null)
    {
        $this->slug = $slug;
        $this->args = $args;
        // Set messenger instance, falling back to default if not provided.
        $this->messenger = $this->get_messenger($messenger);
    }
    /**
     * Get the license key.
     *
     * @since 1.0.0
     * @return string
     */
    public function get_license_key()
    {
        return get_option($this->get_key_option_name());
    }
    /**
     * Gets the license key option name.
     *
     * @since 1.0.0
     * @return string
     */
    public function get_key_option_name()
    {
        return !empty($this->args['option_name']) ? $this->args['option_name'] : "{$this->slug}_license_key";
    }
    /**
     * Gets the button for the pass field.
     *
     * @since 1.0.0
     * @param bool $should_echo Whether to echo the button.
     * @return string
     */
    public function get_actions($should_echo = \false)
    {
        $license_data = get_option($this->get_status_option_name());
        $status = $license_data->license ?? 'inactive';
        $button = $this->get_button_args($status);
        $timestamp = time();
        if (!$should_echo) {
            ob_start();
        }
        ?>
		<div class="edd-sl-sdk-licensing__actions">
			<button
				class="button button-<?php 
        echo esc_attr($button['class']);
        ?> edd-sl-sdk__action"
				data-action="<?php 
        echo esc_attr($button['action']);
        ?>"
				data-timestamp="<?php 
        echo esc_attr($timestamp);
        ?>"
				data-token="<?php 
        echo esc_attr(\EasyDigitalDownloads\Updater\Utilities\Tokenizer::tokenize($timestamp));
        ?>"
				data-nonce="<?php 
        echo esc_attr(wp_create_nonce('edd_sl_sdk_license_handler'));
        ?>"
			>
				<?php 
        echo esc_html($button['label']);
        ?>
			</button>
			<?php 
        if ('activate' === $button['action'] && !empty($this->get_license_key())) {
            ?>
				<button
					class="button button-secondary edd-sl-sdk-license__delete"
					data-action="delete"
					data-timestamp="<?php 
            echo esc_attr($timestamp);
            ?>"
					data-token="<?php 
            echo esc_attr(\EasyDigitalDownloads\Updater\Utilities\Tokenizer::tokenize($timestamp));
            ?>"
					data-nonce="<?php 
            echo esc_attr(wp_create_nonce('edd_sl_sdk_license_handler-delete'));
            ?>"
				>
					<?php 
            echo esc_html($this->messenger->get_delete_button_label());
            ?>
				</button>
			<?php 
        }
        ?>
		</div>
		<?php 
        if (!$should_echo) {
            return ob_get_clean();
        }
    }
    /**
     * AJAX handler for activating a license.
     *
     * @since 1.0.0
     * @return void
     */
    public function ajax_activate()
    {
        if (!$this->can_manage_license()) {
            wp_send_json_error(array('message' => wpautop($this->messenger->get_permission_denied_message())));
        }
        $license_key = filter_input(\INPUT_POST, 'license', \FILTER_SANITIZE_SPECIAL_CHARS);
        $api_params = array('edd_action' => 'activate_license', 'license' => $license_key, 'item_id' => $this->args['item_id']);
        $api = new \EasyDigitalDownloads\Updater\Requests\API($this->args['api_url']);
        $license_data = $api->make_request($api_params);
        if (empty($license_data->success)) {
            wp_send_json_error(array('message' => wpautop($this->messenger->get_activation_error_message())));
        }
        update_option($this->get_key_option_name(), $license_key);
        $this->save($license_data);
        wp_send_json_success(array('message' => wpautop($this->messenger->get_activation_success_message()), 'actions' => $this->get_actions()));
    }
    /**
     * AJAX handler for deactivating a license.
     *
     * @since 1.0.0
     * @return void
     */
    public function ajax_deactivate()
    {
        if (!$this->can_manage_license()) {
            wp_send_json_error(array('message' => wpautop($this->messenger->get_permission_denied_message())));
        }
        $license_key = filter_input(\INPUT_POST, 'license', \FILTER_SANITIZE_SPECIAL_CHARS);
        $api_params = array('edd_action' => 'deactivate_license', 'license' => $license_key, 'item_id' => $this->args['item_id']);
        $api = new \EasyDigitalDownloads\Updater\Requests\API($this->args['api_url']);
        $license_data = $api->make_request($api_params);
        if (empty($license_data->success)) {
            wp_send_json_error(array('message' => wpautop($this->messenger->get_deactivation_error_message())));
        }
        delete_option($this->get_status_option_name());
        wp_send_json_success(array('message' => wpautop($this->messenger->get_deactivation_success_message()), 'actions' => $this->get_actions()));
    }
    /**
     * AJAX handler for deleting a license.
     *
     * @since 1.0.0
     * @return void
     */
    public function ajax_delete()
    {
        if (!$this->can_manage_license('edd_sl_sdk_license_handler-delete')) {
            wp_send_json_error(array('message' => wpautop($this->messenger->get_permission_denied_message())));
        }
        delete_option($this->get_key_option_name());
        wp_send_json_success(array('message' => wpautop($this->messenger->get_deletion_success_message()), 'actions' => $this->get_actions()));
    }
    /**
     * AJAX handler for updating data tracking preference.
     *
     * @since 1.0.0
     * @return void
     */
    public function ajax_update_tracking()
    {
        if (!$this->can_manage_license('edd_sl_sdk_data_tracking')) {
            wp_send_json_error(array('message' => wpautop($this->messenger->get_permission_denied_setting_message())));
        }
        $allow_tracking = filter_input(\INPUT_POST, 'allow_tracking', \FILTER_VALIDATE_BOOLEAN);
        // Save the preference with timestamp
        $option_name = $this->get_key_option_name() . '_allow_tracking';
        $data = array('allowed' => $allow_tracking, 'timestamp' => time());
        update_option($option_name, $data);
        $message = $allow_tracking ? $this->messenger->get_tracking_enabled_message() : $this->messenger->get_tracking_disabled_message();
        wp_send_json_success(array('message' => wpautop($message)));
    }
    /**
     * Gets the allow tracking option name.
     *
     * @since 1.0.0
     * @return string
     */
    public function get_allow_tracking()
    {
        $data = get_option($this->get_key_option_name() . '_allow_tracking');
        // Handle legacy boolean values
        if (is_bool($data)) {
            return $data;
        }
        // Handle new array format with timestamp
        if (is_array($data) && isset($data['allowed'])) {
            return $data['allowed'];
        }
        return \false;
    }
    /**
     * Gets the license status message.
     *
     * @since 1.0.0
     * @return void
     */
    public function get_license_status_message()
    {
        $status = get_option($this->get_status_option_name());
        if (empty($status) || empty($status->license)) {
            return;
        }
        $messages = new \EasyDigitalDownloads\Updater\Licensing\Messages(array('status' => $status->license, 'license_key' => $this->get_license_key(), 'expires' => $status->expires, 'name' => $status->item_name), $this->messenger);
        $message = $messages->get_message();
        if ($message) {
            echo '<div class="edd-sl-sdk__license-status-message">' . wp_kses_post(wpautop($message)) . '</div>';
        }
    }
    /**
     * Saves the license data.
     *
     * @since 1.0.0
     * @param \stdClass $license_data The license data.
     * @return void
     */
    public function save($license_data)
    {
        update_option($this->get_status_option_name(), $license_data);
    }
    /**
     * Get the button parameters based on the status.
     *
     * @since 1.0.0
     * @param string $state
     * @return array
     */
    private function get_button_args($state = 'inactive')
    {
        if (in_array($state, array('valid', 'active'), \true)) {
            return array('action' => 'deactivate', 'label' => $this->messenger->get_deactivate_button_label(), 'class' => 'secondary');
        }
        return array('action' => 'activate', 'label' => $this->messenger->get_activate_button_label(), 'class' => 'secondary');
    }
    /**
     * Whether the current user can manage the pass.
     * Checks the user capabilities, tokenizer, and nonce.
     *
     * @since 1.0.0
     * @param string $nonce The name of the specific nonce to validate.
     * @return bool
     */
    private function can_manage_license($nonce_name = 'edd_sl_sdk_license_handler')
    {
        if (!current_user_can('manage_options')) {
            return \false;
        }
        $token = filter_input(\INPUT_POST, 'token', \FILTER_SANITIZE_SPECIAL_CHARS);
        $timestamp = filter_input(\INPUT_POST, 'timestamp', \FILTER_SANITIZE_SPECIAL_CHARS);
        if (empty($timestamp) || empty($token)) {
            return \false;
        }
        $nonce = filter_input(\INPUT_POST, 'nonce', \FILTER_SANITIZE_SPECIAL_CHARS);
        return \EasyDigitalDownloads\Updater\Utilities\Tokenizer::is_token_valid($token, $timestamp) && wp_verify_nonce($nonce, $nonce_name);
    }
    /**
     * Gets the status option name.
     *
     * @since 1.0.0
     * @return string
     */
    public function get_status_option_name()
    {
        return !empty($this->args['option_name']) ? "{$this->args['option_name']}_license" : "{$this->slug}_license";
    }
}
