<?php

declare(strict_types=1);

use Isolated\Symfony\Component\Finder\Finder;

// You can do your own things here, e.g. collecting symbols to expose dynamically
// or files to exclude.
// However beware that this file is executed by PHP-Scoper, hence if you are using
// the PHAR it will be loaded by the PHAR. So it is highly recommended to avoid
// to auto-load any code here: it can result in a conflict or even corrupt
// the PHP-Scoper analysis.

// $timestamp = date('Ymd');

$wp_classes   = json_decode(file_get_contents('deploy/php-scoper-wordpress-excludes-master/generated/exclude-wordpress-classes.json'));
$wp_functions = json_decode(file_get_contents('deploy/php-scoper-wordpress-excludes-master/generated/exclude-wordpress-functions.json'));
$wp_constants = json_decode(file_get_contents('deploy/php-scoper-wordpress-excludes-master/generated/exclude-wordpress-constants.json'));

/**
 * @see https://github.com/humbug/php-scoper/blob/main/docs/further-reading.md#polyfills
 */
$polyfillsBootstraps = array_map(
    static fn (SplFileInfo $fileInfo) => $fileInfo->getPathname(),
    iterator_to_array(
        Finder::create()
            ->files()
            ->in(dirname(__DIR__) . '/vendor/symfony/polyfill-*')
            ->name('bootstrap*.php'),
        false,
    ),
);

$polyfillsStubs = array_map(
    static fn (SplFileInfo $fileInfo) => $fileInfo->getPathname(),
    iterator_to_array(
        Finder::create()
            ->files()
            ->in(dirname(__DIR__) . '/vendor/symfony/polyfill-*/Resources/stubs')
            ->name('*.php'),
        false,
    ),
);

// EDD's SDK coordinates versions across plugins with global, string-based
// callbacks. Keep its bootstrap and namespace intact so those callbacks remain
// callable in the scoped Pro artifact.
$eddSlSdkBootstrap = dirname(__DIR__) . '/vendor/easy-digital-downloads/edd-sl-sdk/edd-sl-sdk.php';

$wpAbilityApiFiles = array_map(
    static fn (SplFileInfo $fileInfo) => $fileInfo->getPathname(),
    iterator_to_array(
        Finder::create()
            ->files()
            ->in(dirname(__DIR__) . '/vendor/wordpress/abilities-api')
            ->name('*.php'),
        false,
    ),
);

return [
    // The prefix configuration. If a non null value is be used, a random prefix
    // will be generated instead.
    //
    // For more see: https://github.com/humbug/php-scoper/blob/master/docs/configuration.md#prefix
    // 'prefix' => '_Yabe' . $timestamp,
    'prefix' => 'WindPressDeps',

    // By default when running php-scoper add-prefix, it will prefix all relevant code found in the current working
    // directory. You can however define which files should be scoped by defining a collection of Finders in the
    // following configuration key.
    //
    // This configuration entry is completely ignored when using Box.
    //
    // For more see: https://github.com/humbug/php-scoper/blob/master/docs/configuration.md#finders-and-paths
    // 'finders' => [
    //     Finder::create()->files()->in('src'),
    //     Finder::create()->files()->in('templates'),
    //     Finder::create()
    //         ->files()
    //         ->ignoreVCS(true)
    //         ->notName('/LICENSE|.*\\.md|.*\\.dist|Makefile|composer\\.json|composer\\.lock/')
    //         ->exclude([
    //             'doc',
    //             'test',
    //             'test_old',
    //             'tests',
    //             'Tests',
    //             'vendor-bin',
    //         ])
    //         ->in('vendor'),
    //     Finder::create()->append([
    //         'composer.json',
    //         'wakaloka-winden.php',
    //     ]),
    // ],

    // List of excluded files, i.e. files for which the content will be left untouched.
    // Paths are relative to the configuration file unless if they are already absolute
    //
    // For more see: https://github.com/humbug/php-scoper/blob/master/docs/configuration.md#patchers
    'exclude-files' => [
        // 'src/a-whitelisted-file.php',

        ...(is_file($eddSlSdkBootstrap) ? [$eddSlSdkBootstrap] : []),
        ...$polyfillsBootstraps,
        ...$polyfillsStubs,
        ...$wpAbilityApiFiles,
    ],

    // When scoping PHP files, there will be scenarios where some of the code being scoped indirectly references the
    // original namespace. These will include, for example, strings or string manipulations. PHP-Scoper has limited
    // support for prefixing such strings. To circumvent that, you can define patchers to manipulate the file to your
    // heart contents.
    //
    // For more see: https://github.com/humbug/php-scoper/blob/master/docs/configuration.md#patchers
    'patchers' => [
        /**
         * @see https://github.com/humbug/php-scoper/issues/841
         */
        // static function (string $filePath, string $prefix, string $contents): string {
        //     if (preg_match('/vendor\/composer\/autoload_real\.php$/', $filePath)) {
        //         return preg_replace(
        //             [
        //                 "/'Composer\\\\\\\\Autoload\\\\\\\\ClassLoader'/",
        //                 "/spl_autoload_unregister\(array\('ComposerAutoloaderInit/",
        //             ],
        //             [
        //                 "'{$prefix}\\\\\\\\Composer\\\\\\\\Autoload\\\\\\\\ClassLoader'",
        //                 "spl_autoload_unregister(array('{$prefix}\\\\\\\\ComposerAutoloaderInit",
        //             ],
        //             $contents
        //         );
        //     }

        //     return $contents;
        // },
    ],

    // List of symbols to consider internal i.e. to leave untouched.
    //
    // For more information see: https://github.com/humbug/php-scoper/blob/master/docs/configuration.md#excluded-symbols
    'exclude-namespaces' => [
        // 'Acme\Foo'                     // The Acme\Foo namespace (and sub-namespaces)
        // '~^PHPUnit\\\\Framework$~',    // The whole namespace PHPUnit\Framework (but not sub-namespaces)
        // '~^$~',                        // The root namespace only
        // '',                            // Any namespace,

        // 'Composer',

        'WindPress',
        'WIND_PRESS',
        'WP_CLI',
        'Symfony\Polyfill',
        'EasyDigitalDownloads\Updater',

        'Bricks',
        'Timber',
        'Blockstudio',
        'Breakdance',
        'Builderius',
        'Elementor',
        'MBViews',

        'SiteGround_Optimizer',
    ],
    'exclude-classes' => array_merge(
        $wp_classes,
        [
            'WIND_PRESS',

            'WP_CLI',
            'WP_CLI_Command',
            // 'ReflectionClassConstant',

            'DOMXPath',
        ]
    ),
    'exclude-functions' => array_merge(
        $wp_functions,
        [
            // 'mb_str_split',
            
            'wp_cache_flush',
            'rocket_clean_domain',
            'wp_cache_clear_cache',
            'w3tc_flush_all',
            'wpfc_clear_all_cache',

            'bricks_is_builder_main',
            'bricks_is_builder_iframe',

            'oxygen_safe_convert_old_shortcodes_to_json',

            'mb_views_load', // Meta Box Views
        ]
    ),
    'exclude-constants' => array_merge(
        $wp_constants,
        [
            // Symfony global constants
            '/^SYMFONY\_[\p{L}_]+$/',

            'WP_CONTENT_DIR',
            'WP_CONTENT_URL',
            'ABSPATH',
            'WPINC',
            'WP_DEBUG_DISPLAY',
            'WPMU_PLUGIN_DIR',
            'WP_PLUGIN_DIR',
            'WP_PLUGIN_URL',
            'WPMU_PLUGIN_URL',
            'MINUTE_IN_SECONDS',
            'HOUR_IN_SECONDS',
            'DAY_IN_SECONDS',
            'MONTH_IN_SECONDS',
            'debugger',

            'BRICKS_VERSION', // Bricks
            'BRICKS_DB_PAGE_HEADER',
            'BRICKS_DB_PAGE_CONTENT',
            'BRICKS_DB_PAGE_FOOTER',
            'BRICKS_DB_TEMPLATE_SLUG',
            'BRICKS_DB_GLOBAL_CLASSES',

            'CT_PLUGIN_MAIN_FILE', // Oxygen

            'LC_MU_PLUGIN_NAME', // LiveCanvas

            'GREENSHIFT_DIR_PATH', // Greenshift

            'KADENCE_BLOCKS_VERSION', // Kadence Blocks
            'KADENCE_VERSION', // Kadence Theme

            '__BREAKDANCE_VERSION', // Breakdance
            'BREAKDANCE_MODE',

            'ELEMENTOR_VERSION', // Elementor

            'WPCODEBOX2_VERSION', // WPCodeBox2
        ]
    ),

    // List of symbols to expose.
    //
    // For more information see: https://github.com/humbug/php-scoper/blob/master/docs/configuration.md#exposed-symbols
    'expose-global-constants' => false,
    'expose-global-classes' => false,
    'expose-global-functions' => false,
    'expose-namespaces' => [
        // 'Acme\Foo'                     // The Acme\Foo namespace (and sub-namespaces)
        // '~^PHPUnit\\\\Framework$~',    // The whole namespace PHPUnit\Framework (but not sub-namespaces)
        // '~^$~',                        // The root namespace only
        // '',                            // Any namespace
    ],
    'expose-classes' => [
        'WIND_PRESS',
    ],
    'expose-functions' => [
        'leak',
    ],
    'expose-constants' => [],
];
