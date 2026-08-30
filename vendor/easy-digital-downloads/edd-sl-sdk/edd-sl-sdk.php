<?php
/**
 * Plugin Name: EDD SL SDK
 * Plugin URI: https://easydigitaldownloads.com
 * Description: The Software Licensing SDK for plugins and themes using Software Licensing.
 * Version: 1.0.3
 * Author: Easy Digital Downloads
 * Author URI: https://easydigitaldownloads.com
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: edd-sl-sdk
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit; // @codeCoverageIgnore

// Include the autoloader only if it hasn't been loaded yet.
// Use a unique constant to prevent multiple autoloader includes.
if ( ! defined( 'EDD_SL_SDK_AUTOLOADER_LOADED' ) ) {
	define( 'EDD_SL_SDK_AUTOLOADER_LOADED', true );
	if ( ! class_exists( '\\EasyDigitalDownloads\\Updater\\Versions' ) ) {
		require_once __DIR__ . '/vendor/autoload.php';
	}
}

// Only set up hooks if WordPress functions are available (not during composer autoload initialization).
if ( ! function_exists( 'edd_sl_sdk_register_1_0_3' ) && function_exists( 'add_action' ) ) { // WRCS: DEFINED_VERSION.

	add_action( 'after_setup_theme', array( '\\EasyDigitalDownloads\\Updater\\Versions', 'initialize_latest_version' ), 1, 0 );
	add_action( 'after_setup_theme', 'edd_sl_sdk_register_1_0_3', 0, 0 ); // WRCS: DEFINED_VERSION.

	/**
	 * Registers this version of the SDK.
	 */
	function edd_sl_sdk_register_1_0_3() {
		$version  = '1.0.3';
		$versions = EasyDigitalDownloads\Updater\Versions::instance();
		$versions->register( $version, 'edd_sl_sdk_initialize_1_0_3' ); // WRCS: DEFINED_VERSION.
	}

	// phpcs:disable Generic.Functions.OpeningFunctionBraceKernighanRitchie.ContentAfterBrace
	/**
	 * Initializes this version of the SDK.
	 */
	function edd_sl_sdk_initialize_1_0_3() {
		// Set up the SDK paths and version using the Path utility.
		EasyDigitalDownloads\Updater\Utilities\Path::set( __FILE__, '1.0.3' );
		do_action( 'edd_sl_sdk_registry', EasyDigitalDownloads\Updater\Registry::instance() );
	}

	// Support usage in themes or when included directly - initialize this version if no plugin has loaded a version yet.
	if ( did_action( 'after_setup_theme' ) && ! doing_action( 'after_setup_theme' ) && ! class_exists( '\\EasyDigitalDownloads\\Updater\\Registry', false ) ) {
		edd_sl_sdk_initialize_1_0_3(); // WRCS: DEFINED_VERSION.
		EasyDigitalDownloads\Updater\Versions::initialize_latest_version();
	}
}
