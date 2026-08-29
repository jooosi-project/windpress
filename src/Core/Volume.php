<?php

/*
 * This file is part of the WindPress package.
 *
 * (c) Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

namespace WindPress\WindPress\Core;

use Symfony\Component\Filesystem\Path;
use Symfony\Component\Finder\Finder;
use WIND_PRESS;
use WindPress\WindPress\Utils\Common;

/**
 * @since 3.1.11
 */
class Volume
{
    public static function get_entries(): array
    {
        $entries = [];

        $data_dir = static::data_dir_path();

        if (! file_exists($data_dir)) {
            wp_mkdir_p($data_dir);
        }

        $finder = new Finder();

        $finder
            ->ignoreUnreadableDirs()
            ->in($data_dir)
            ->files()
            ->followLinks()
            ->name(['*.css', '*.js']);

        do_action('a!windpress/core/volume:get_entries.finder', $finder);

        foreach ($finder as $file) {
            if (! is_readable($file->getPathname())) {
                continue;
            }

            $entries[] = [
                'name' => $file->getFilename(),
                'relative_path' => $file->getRelativePathname(),
                'content' => $file->getContents(),
                'handler' => 'internal',
                'signature' => wp_create_nonce(sprintf('%s:%s', WIND_PRESS::WP_OPTION, $file->getRelativePathname())),
                'readonly' => strpos(wp_normalize_path($file->getPathname()), wp_normalize_path($data_dir)) === false,
                'path_on_disk' => $file->getPathname(),
            ];
        }

        $directory_finder = new Finder();

        $directory_finder
            ->ignoreUnreadableDirs()
            ->in($data_dir)
            ->directories()
            ->followLinks();

        foreach ($directory_finder as $directory) {
            $entries[] = [
                'name' => $directory->getBasename(),
                'relative_path' => $directory->getRelativePathname(),
                'content' => '',
                'handler' => 'internal',
                'directory' => true,
                'readonly' => false,
                'path_on_disk' => $directory->getPathname(),
            ];
        }

        $tailwindcss_version = Runtime::tailwindcss_version();

        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file
        $stubs_main_css = file_get_contents(sprintf('%s/stubs/tailwindcss-v%d/main.css', dirname(WIND_PRESS::FILE), $tailwindcss_version));

        // check if 'main.css' already exists and content is not empty, else use the stubs
        $main_css_key = array_search('main.css', array_column($entries, 'name'), true);

        if ($main_css_key === false) {
            $entries[] = [
                'name' => 'main.css',
                'relative_path' => 'main.css',
                'content' => $stubs_main_css,
                'handler' => 'internal',
                'signature' => wp_create_nonce(sprintf('%s:%s', WIND_PRESS::WP_OPTION, 'main.css')),
            ];
        } elseif (empty($entries[$main_css_key]['content'])) {
            $entries[$main_css_key]['content'] = $stubs_main_css;
        }

        if ($tailwindcss_version === 3) {
            $stubs_tailwind_config_js = file_get_contents(dirname(WIND_PRESS::FILE) . '/stubs/tailwindcss-v3/tailwind.config.js');
            $stubs_wizard_js = file_get_contents(dirname(WIND_PRESS::FILE) . '/stubs/tailwindcss-v3/wizard.js');

            // check if 'tailwind.config.js' already exists and content is not empty, else use the stubs
            $tailwind_config_js_key = array_search('tailwind.config.js', array_column($entries, 'name'), true);

            if ($tailwind_config_js_key === false) {
                $entries[] = [
                    'name' => 'tailwind.config.js',
                    'relative_path' => 'tailwind.config.js',
                    'content' => $stubs_tailwind_config_js,
                    'handler' => 'internal',
                    'signature' => wp_create_nonce(sprintf('%s:%s', WIND_PRESS::WP_OPTION, 'tailwind.config.js')),
                ];
            } elseif (empty($entries[$tailwind_config_js_key]['content'])) {
                $entries[$tailwind_config_js_key]['content'] = $stubs_tailwind_config_js;
            }

            // check if 'wizard.js' already exists and content is not empty, else use the stubs
            $wizard_js_key = array_search('wizard.js', array_column($entries, 'name'), true);

            if ($wizard_js_key === false) {
                $entries[] = [
                    'name' => 'wizard.js',
                    'relative_path' => 'wizard.js',
                    'content' => $stubs_wizard_js,
                    'handler' => 'internal',
                    'signature' => wp_create_nonce(sprintf('%s:%s', WIND_PRESS::WP_OPTION, 'wizard.js')),
                ];
            } elseif (empty($entries[$wizard_js_key]['content'])) {
                $entries[$wizard_js_key]['content'] = $stubs_wizard_js;
            }
        } elseif ($tailwindcss_version === 4) {
            $stubs_wizard_css = file_get_contents(dirname(WIND_PRESS::FILE) . '/stubs/tailwindcss-v4/wizard.css');

            // check if 'wizard.css' already exists and content is not empty, else use the stubs
            $wizard_css_key = array_search('wizard.css', array_column($entries, 'name'), true);

            if ($wizard_css_key === false) {
                $entries[] = [
                    'name' => 'wizard.css',
                    'relative_path' => 'wizard.css',
                    'content' => $stubs_wizard_css,
                    'handler' => 'internal',
                    'signature' => wp_create_nonce(sprintf('%s:%s', WIND_PRESS::WP_OPTION, 'wizard.css')),
                ];
            } elseif (empty($entries[$wizard_css_key]['content'])) {
                $entries[$wizard_css_key]['content'] = $stubs_wizard_css;
            }
        }

        /**
         * @param array $entries The list of volume's entries. Each volume have `name`, `relative_path`, `content`, `handler`, and `signature` keys.
         */
        return apply_filters('f!windpress/core/volume:get_entries.entries', $entries);
    }

    public static function save_entries($entries): array
    {
        $result = [
            'saved' => [],
            'deleted' => [],
            'handled' => [],
            'skipped' => [],
            'errors' => [],
        ];

        if (! is_array($entries)) {
            $result['errors'][] = [
                'code' => 'invalid_entries',
                'message' => __('Entries must be an array.', 'windpress'),
            ];

            return $result;
        }

        $data_dir = static::data_dir_path();

        foreach ($entries as $entry) {
            if (! is_array($entry)) {
                $result['skipped'][] = [
                    'relative_path' => '',
                    'reason' => 'invalid_entry',
                    'message' => __('Entry must be an array.', 'windpress'),
                ];

                continue;
            }

            $relative_path = isset($entry['relative_path']) && is_scalar($entry['relative_path']) ? (string) $entry['relative_path'] : '';

            // if doesn't have any of the following keys, skip: name, relative_path, content, handler
            if (! isset($entry['name'], $entry['relative_path'], $entry['content'], $entry['handler'])) {
                $result['skipped'][] = [
                    'relative_path' => $relative_path,
                    'reason' => 'missing_required_fields',
                    'message' => __('Entry is missing required fields.', 'windpress'),
                ];

                continue;
            }

            if (! is_string($entry['name']) || ! is_string($entry['relative_path']) || ! is_string($entry['handler'])) {
                $result['skipped'][] = [
                    'relative_path' => $relative_path,
                    'reason' => 'invalid_entry',
                    'message' => __('Entry name, relative path, and handler must be strings.', 'windpress'),
                ];

                continue;
            }

            // skip the readonly entries
            if (isset($entry['readonly']) && $entry['readonly']) {
                $result['skipped'][] = [
                    'relative_path' => $relative_path,
                    'reason' => 'readonly_entry',
                    'message' => __('Read-only entries cannot be saved.', 'windpress'),
                ];

                continue;
            }

            if (! empty($entry['directory'])) {
                if ($entry['handler'] !== 'internal') {
                    $result['skipped'][] = [
                        'relative_path' => $relative_path,
                        'reason' => 'invalid_directory_handler',
                        'message' => __('Directories must use the internal handler.', 'windpress'),
                    ];

                    continue;
                }

                try {
                    $safe_directory_path = static::sanitize_relative_path($entry['relative_path'], $data_dir);

                    if (! empty($entry['hidden'])) {
                        if (is_dir($safe_directory_path) && ! rmdir($safe_directory_path)) {
                            throw new \RuntimeException(__('Directory is not empty.', 'windpress'));
                        }

                        $result['deleted'][] = [
                            'relative_path' => $relative_path,
                        ];
                    } else {
                        if (file_exists($safe_directory_path) && ! is_dir($safe_directory_path)) {
                            throw new \RuntimeException(__('A file already exists at the directory path.', 'windpress'));
                        }

                        if (! is_dir($safe_directory_path) && ! wp_mkdir_p($safe_directory_path)) {
                            throw new \RuntimeException(__('The directory could not be created.', 'windpress'));
                        }

                        $result['saved'][] = [
                            'relative_path' => $relative_path,
                        ];
                    }
                } catch (\InvalidArgumentException $th) {
                    $result['skipped'][] = [
                        'relative_path' => $relative_path,
                        'reason' => 'invalid_path',
                        'message' => __('Directory path is invalid.', 'windpress'),
                    ];
                } catch (\Throwable $th) {
                    if (WP_DEBUG_LOG) {
                        error_log($th->__toString());
                    }

                    $result['errors'][] = [
                        'relative_path' => $relative_path,
                        'code' => 'filesystem_error',
                        'message' => $th->getMessage(),
                    ];
                }

                continue;
            }

            if ($entry['handler'] !== 'internal') {
                // the handler only accept alphanumeric, hyphens, and underscores
                if (! is_string($entry['handler']) || ! preg_match('/^[a-zA-Z0-9_-]+$/', $entry['handler'])) {
                    $result['skipped'][] = [
                        'relative_path' => $relative_path,
                        'reason' => 'invalid_handler',
                        'message' => __('Entry handler is invalid.', 'windpress'),
                    ];

                    continue;
                }

                do_action('a!windpress/core/volume:save_entries.entry', $entry);

                // use specific handler instead for efficient handling
                do_action('a!windpress/core/volume:save_entries.entry.' . $entry['handler'], $entry);

                $result['handled'][] = [
                    'relative_path' => $relative_path,
                    'handler' => $entry['handler'],
                ];

                continue;
            }

            // if the signature is not set, it is a new entry.
            if (! isset($entry['signature'])) {
                // sanitize the file name.
                add_filter('sanitize_file_name_chars', [static::class, 'sanitize_file_name_chars'], 10, 2);
                // split the path, and sanitize each part.
                $entry['relative_path'] = implode('/', array_map('sanitize_file_name', explode('/', $entry['relative_path'])));
                $entry['relative_path'] = sanitize_file_name($entry['relative_path']);
                remove_filter('sanitize_file_name_chars', [static::class, 'sanitize_file_name_chars'], 10);

                $entry['name'] = pathinfo($entry['relative_path'], PATHINFO_BASENAME);

                // only handle a css and js files.
                if (! in_array(pathinfo($entry['name'], PATHINFO_EXTENSION), ['css', 'js'], true)) {
                    $result['skipped'][] = [
                        'relative_path' => $entry['relative_path'],
                        'reason' => 'unsupported_file_type',
                        'message' => __('Only CSS and JavaScript files can be saved.', 'windpress'),
                    ];

                    continue;
                }

                $entry['signature'] = wp_create_nonce(sprintf('%s:%s', WIND_PRESS::WP_OPTION, $entry['relative_path']));
            }

            // verify the signature
            if (! wp_verify_nonce($entry['signature'], sprintf('%s:%s', WIND_PRESS::WP_OPTION, $entry['relative_path']))) {
                $result['skipped'][] = [
                    'relative_path' => $entry['relative_path'],
                    'reason' => 'invalid_signature',
                    'message' => __('Entry signature is invalid.', 'windpress'),
                ];

                continue;
            }

            try {
                // Sanitize and validate the path to prevent directory traversal
                $safe_file_path = static::sanitize_relative_path($entry['relative_path'], $data_dir);

                // if the content is empty, delete the file.
                if ($entry['content'] === '') {
                    if (file_exists($safe_file_path)) {
                        Common::delete_file($safe_file_path);
                    }

                    $result['deleted'][] = [
                        'relative_path' => $entry['relative_path'],
                    ];
                } else {
                    Common::save_file($entry['content'], $safe_file_path);

                    $result['saved'][] = [
                        'relative_path' => $entry['relative_path'],
                    ];
                }
            } catch (\InvalidArgumentException $th) {
                $result['skipped'][] = [
                    'relative_path' => $entry['relative_path'],
                    'reason' => 'invalid_path',
                    'message' => __('Entry path is invalid.', 'windpress'),
                ];
            } catch (\Throwable $th) {
                if (WP_DEBUG_LOG) {
                    error_log($th->__toString());
                }

                $result['errors'][] = [
                    'relative_path' => $entry['relative_path'],
                    'code' => 'filesystem_error',
                    'message' => $th->getMessage(),
                ];
            }
        }

        return $result;
    }

    public static function sanitize_file_name_chars(array $special_chars, $filename_raw)
    {
        // allow dir
        return array_diff($special_chars, ['/']);
    }

    public static function data_dir_url(): string
    {
        return wp_upload_dir()['baseurl'] . WIND_PRESS::DATA_DIR;
    }

    public static function data_dir_path(): string
    {
        return wp_upload_dir()['basedir'] . WIND_PRESS::DATA_DIR;
    }

    public static function get_available_handlers(): array
    {
        return apply_filters('f!windpress/core/volume:get_available_handlers', []);
    }

    /**
     * Sanitize and validate a relative path to prevent directory traversal attacks.
     *
     * @param string $relative_path The relative path to sanitize
     * @param string $base_dir The base directory that the path should be contained within
     * @return string The sanitized and validated absolute path
     * @throws \InvalidArgumentException If the path attempts to escape the base directory
     * @since 3.3.65
     */
    private static function sanitize_relative_path(string $relative_path, string $base_dir): string
    {
        // Remove any null bytes
        $relative_path = str_replace("\0", '', $relative_path);

        // Canonicalize the base directory path
        $base_dir = Path::canonicalize($base_dir);

        // Canonicalize the relative path to resolve .. and normalize separators
        $canonical_path = Path::canonicalize($relative_path);

        // Build the full path
        $full_path = Path::join($base_dir, $canonical_path);

        // Validate that the resolved path doesn't escape the base directory
        // Use Symfony's isBasePath() which handles platform differences automatically
        if (! Path::isBasePath($base_dir, $full_path)) {
            throw new \InvalidArgumentException('Path traversal attempt detected: ' . $relative_path);
        }

        return $full_path;
    }
}
