<?php

/**
 * Registry.
 *
 * @package EasyDigitalDownloads\Updater
 * @since 1.0.0
 */
namespace EasyDigitalDownloads\Updater;

// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
class Registry extends \ArrayObject
{
    /**
     * The instance.
     *
     * @var Registry
     */
    private static $instance;
    /**
     * Gets the instance.
     *
     * @since 1.0.0
     * @return Registry
     */
    public static function instance()
    {
        if (!self::$instance) {
            self::$instance = new self();
            new \EasyDigitalDownloads\Updater\Admin\Notices();
        }
        return self::$instance;
    }
    /**
     * Registers an integration.
     *
     * @since 1.0.0
     * @param array $integration
     * @return void
     */
    public function register(array $integration)
    {
        try {
            self::instance()->add($integration);
        } catch (\InvalidArgumentException $e) {
            wp_die(esc_html($e->getMessage()));
        }
    }
    /**
     * Adds an integration.
     *
     * @since 1.0.0
     * @param array $integration
     * @return void
     */
    private function add(array $integration)
    {
        if (empty($integration['id'])) {
            throw new \InvalidArgumentException('The integration ID is required.');
        }
        if (empty($integration['url'])) {
            throw new \InvalidArgumentException('The integration URL is required.');
        }
        if (empty($integration['item_id'])) {
            throw new \InvalidArgumentException('The integration item ID is required.');
        }
        if ($this->offsetExists($integration['id'])) {
            throw new \InvalidArgumentException(sprintf('The integration %d is already registered.', esc_html($integration['id'])));
        }
        $type = $integration['type'] ?? 'plugin';
        if (!in_array($type, array('plugin', 'theme'), \true)) {
            throw new \InvalidArgumentException('The integration type must be either "plugin" or "theme".');
        }
        // Handle custom messenger class.
        $messenger = $this->get_messenger($integration);
        $handler = 'EasyDigitalDownloads\Updater\Handlers\\' . ucfirst($type);
        $this->offsetSet($integration['id'], new $handler($integration['url'], $integration, $messenger));
    }
    /**
     * Gets the messenger instance.
     *
     * @since 1.0.1
     * @param array $integration The integration array.
     * @return Messenger
     */
    private function get_messenger(array $integration)
    {
        // Use custom messenger class if provided.
        if (!empty($integration['messenger_class'])) {
            $messenger_class = $integration['messenger_class'];
            // Validate that the class exists.
            if (!class_exists($messenger_class)) {
                throw new \InvalidArgumentException(sprintf('The messenger class "%s" does not exist.', esc_html($messenger_class)));
            }
            // Validate that it extends the base Messenger class.
            if (!is_subclass_of($messenger_class, \EasyDigitalDownloads\Updater\Messenger::class)) {
                throw new \InvalidArgumentException(sprintf('The messenger class "%s" must extend EasyDigitalDownloads\Updater\Messenger.', esc_html($messenger_class)));
            }
            return new $messenger_class();
        }
        // Return default messenger.
        return new \EasyDigitalDownloads\Updater\Messenger();
    }
    /**
     * Gets the integrations.
     *
     * @since 1.0.0
     * @return array
     */
    private function get_integrations()
    {
        return $this->getArrayCopy();
    }
}
