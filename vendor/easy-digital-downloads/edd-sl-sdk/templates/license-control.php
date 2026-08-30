<?php

namespace WindPressDeps;

/**
 * License control template.
 *
 * @var $args array
 */
$name = $args['name'];
if (!empty($args['type']) && 'theme' === $args['type']) {
    $name = \wp_get_theme()->get('Name');
}
\do_action("edd_sl_sdk_license_control_before_{$args['id']}", $args);
?>
<div class="edd-sl-sdk__license">
	<label for="edd_sl_sdk[<?php 
echo \esc_attr($args['item_id']);
?>]">
		<?php 
echo \esc_html($args['messenger']->get_license_key_label($name));
?>
	</label>
	<div class="edd-sl-sdk__license-control">
		<input type="password" autocomplete="off" class="edd-sl-sdk__license--input regular-text" id="edd_sl_sdk[<?php 
echo \esc_attr($args['item_id']);
?>]" name="<?php 
echo \esc_attr($args['license']->get_key_option_name());
?>" value="<?php 
echo \esc_attr($args['license']->get_license_key());
?>" data-item="<?php 
echo \esc_attr($args['item_id']);
?>" data-key="<?php 
echo \esc_attr($args['license']->get_key_option_name());
?>" data-slug="<?php 
echo \esc_attr($args['slug']);
?>" />
		<?php 
$args['license']->get_actions(\true);
?>
	</div>
	<?php 
$args['license']->get_license_status_message();
?>
</div>
<div class="edd-sl-sdk__data">
	<div class="edd-sl-sdk__data-control">
		<?php 
$tracking_timestamp = \time();
?>
		<input type="checkbox"
			id="edd_sl_sdk_allow_data[<?php 
echo \esc_attr($args['item_id']);
?>]"
			name="edd_sl_sdk_allow_data[<?php 
echo \esc_attr($args['item_id']);
?>]"
			value="1"
			data-timestamp="<?php 
echo \esc_attr($tracking_timestamp);
?>"
			data-token="<?php 
echo \esc_attr(\EasyDigitalDownloads\Updater\Utilities\Tokenizer::tokenize($tracking_timestamp));
?>"
			data-nonce="<?php 
echo \esc_attr(\wp_create_nonce('edd_sl_sdk_data_tracking'));
?>"
			data-slug="<?php 
echo \esc_attr($args['slug']);
?>"
			<?php 
\checked($args['license']->get_allow_tracking(), \true);
?> />
		<label for="edd_sl_sdk_allow_data[<?php 
echo \esc_attr($args['item_id']);
?>]">
			<?php 
echo \esc_html($args['messenger']->get_data_tracking_label());
?>
		</label>
	</div>
</div>


<?php 
\do_action("edd_sl_sdk_license_control_after_{$args['id']}", $args);
