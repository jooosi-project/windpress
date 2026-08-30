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
namespace WindPress\WindPress\Integration;

use Exception;
use ReflectionClass;
use WindPressDeps\Symfony\Component\Finder\Finder;
use WIND_PRESS;
class Loader
{
    /**
     * List of Integrations services.
     *
     * @var IntegrationInterface[]
     */
    private array $integrations = [];
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
            self::$instance->scan_integrations();
        }
        return self::$instance;
    }
    public function scan_integrations()
    {
        // Get cached Integrations
        $transient_name = 'windpress_scanned_integrations_' . WIND_PRESS::VERSION;
        /** @var IntegrationInterface[]|false $cached */
        $cached = get_transient($transient_name);
        if (!\WP_DEBUG && $cached !== \false) {
            $this->integrations = $cached;
            return;
        }
        $finder = new Finder();
        $finder->files()->in(__DIR__)->name('*.php');
        /**
         * Add additional places to scan for Integrations.
         *
         * @param Finder $finder The Finder instance.
         */
        do_action('a!windpress/integration/loader:scan_integrations.before_scan', $finder);
        foreach ($finder as $file) {
            $integration_file = $file->getPathname();
            if (!is_readable($integration_file)) {
                continue;
            }
            require_once $integration_file;
        }
        // Find any Integrations that extends IntegrationInterface class
        $declared_classes = get_declared_classes();
        foreach ($declared_classes as $declared_class) {
            if (!class_exists($declared_class)) {
                continue;
            }
            $reflector = new ReflectionClass($declared_class);
            if (!$reflector->isSubclassOf(\WindPress\WindPress\Integration\IntegrationInterface::class)) {
                continue;
            }
            // Get Integration detail and push to Router::$integrations to be register later
            /** @var IntegrationInterface $integration */
            $integration = $reflector->newInstanceWithoutConstructor();
            $this->integrations[$integration->get_name()] = ['name' => $integration->get_name(), 'file_path' => $reflector->getFileName(), 'class_name' => $reflector->getName()];
        }
        // Cache the scanned Integrations
        set_transient($transient_name, $this->integrations, \HOUR_IN_SECONDS);
    }
    /**
     * Register Integrations.
     */
    public function register_integrations(): void
    {
        /**
         * Filter the Integrations before register to WP Rest.
         *
         * @param IntegrationInterface[] $integrations
         * @return IntegrationInterface[]
         */
        /** @var IntegrationInterface[] $integrations */
        $integrations = apply_filters('f!windpress/integration/loader:register_integrations', $this->integrations);
        foreach ($integrations as $integration) {
            // Create new instance of Integration class and register custom endpoints
            /** @var IntegrationInterface $integrationInstance */
            $integrationInstance = new $integration['class_name']();
            $this->integrations[$integration['name']]['instance'] = $integrationInstance;
        }
    }
    /**
     * Get the list of Integrations.
     *
     * @return IntegrationInterface[]
     */
    public function get_integrations(): array
    {
        return $this->integrations;
    }
}
