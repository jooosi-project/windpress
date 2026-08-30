<?php

/**
 * Messenger trait.
 *
 * @since 1.0.1
 *
 * @package EasyDigitalDownloads\Updater\Traits
 * @copyright (c) 2025, Sandhills Development, LLC
 * @license http://opensource.org/licenses/gpl-2.0.php GNU Public License
 * @since 1.0.1
 */
namespace EasyDigitalDownloads\Updater\Traits;

// Exit if accessed directly.
defined('ABSPATH') || exit;
/**
 * Messenger trait.
 *
 * @since 1.0.1
 */
trait Messenger
{
    /**
     * The messenger instance.
     *
     * @var \EasyDigitalDownloads\Updater\Messenger
     */
    protected $messenger;
    /**
     * Gets the messenger instance.
     *
     * @since 1.0.1
     * @return \EasyDigitalDownloads\Updater\Messenger
     */
    protected function get_messenger($messenger = null): \EasyDigitalDownloads\Updater\Messenger
    {
        return $messenger instanceof \EasyDigitalDownloads\Updater\Messenger ? $messenger : new \EasyDigitalDownloads\Updater\Messenger();
    }
}
