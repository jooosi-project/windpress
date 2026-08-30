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
namespace WindPress\WindPress\Api;

use ReflectionClass;
use WindPressDeps\Symfony\Component\Finder\Finder;
use WIND_PRESS;
class Router
{
    /**
     * List of APIs services.
     *
     * @var ApiInterface[]
     */
    private array $apis = [];
    public function __construct()
    {
        $this->scan_apis();
        add_action('rest_api_init', function () {
            $this->register_apis();
        });
    }
    public function scan_apis()
    {
        // Get cached APIs
        $transient_name = 'windpress_scanned_apis_' . WIND_PRESS::VERSION;
        /** @var ApiInterface[]|false $cached */
        $cached = get_transient($transient_name);
        if (!\WP_DEBUG && $cached !== \false) {
            $this->apis = $cached;
            return;
        }
        $finder = new Finder();
        $finder->files()->in(__DIR__)->name('*.php');
        /**
         * Add additional places to scan for APIs.
         *
         * @param Finder $finder The Finder instance.
         */
        do_action('a!windpress/api/router:before_scan', $finder);
        foreach ($finder as $file) {
            $api_file = $file->getPathname();
            if (!is_readable($api_file)) {
                continue;
            }
            require_once $api_file;
        }
        // Find any APIs that extends ApiInterface class
        $declared_classes = get_declared_classes();
        foreach ($declared_classes as $declared_class) {
            if (!class_exists($declared_class)) {
                continue;
            }
            $reflector = new ReflectionClass($declared_class);
            if (!$reflector->isSubclassOf(\WindPress\WindPress\Api\ApiInterface::class)) {
                continue;
            }
            // Get API detail and push to Router::$apis to be register later
            /** @var ApiInterface $api */
            $api = $reflector->newInstanceWithoutConstructor();
            $this->apis[$api->get_prefix()] = ['name' => $api->get_prefix(), 'file_path' => $reflector->getFileName(), 'class_name' => $reflector->getName()];
        }
        // Cache the scanned APIs
        set_transient($transient_name, $this->apis, \HOUR_IN_SECONDS);
    }
    /**
     * Register APIs.
     */
    public function register_apis(): void
    {
        /**
         * Filter the APIs before register to WP Rest.
         *
         * @param ApiInterface[] $apis
         * @return ApiInterface[]
         */
        /** @var ApiInterface[] $apis */
        $apis = apply_filters('f!windpress/api/router:register_apis', $this->apis);
        foreach ($apis as $api) {
            // Create new instance of API class and register custom endpoints
            /** @var ApiInterface $apiInstance */
            $apiInstance = new $api['class_name']();
            $apiInstance->register_custom_endpoints();
        }
    }
}
