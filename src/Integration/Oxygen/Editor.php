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

namespace WindPress\WindPress\Integration\Oxygen;

use WIND_PRESS;
use WindPress\WindPress\Admin\AdminPage;
use WindPress\WindPress\Core\Runtime;
use WindPress\WindPress\Utils\Vite;

/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Editor
{
    public function __construct()
    {
        if (! defined('BREAKDANCE_MODE') || 'oxygen' !== constant('BREAKDANCE_MODE')) {
            return;
        }

        /**
         * @see wp-content/plugins/breakdance/plugin/loader/loader.php#L74
         */
        add_action('unofficial_i_am_kevin_geary_master_of_all_things_css_and_html', fn () => $this->editor_assets(), 1_000_001);
    }

    public function editor_assets()
    {
        if (! (isset($_GET['oxygen']) && $_GET['oxygen'] === 'builder')) {
            return;
        }

        // Manually enqueue the assets since Breakdance doesn't wp_head
        add_filter('f!windpress/core/runtime:append_header.ubiquitous_panel.is_prevent_load', static fn ($is_prevent_load) => true);
        Runtime::get_instance()->append_header();
        wp_head();

        $handle = WIND_PRESS::WP_OPTION . ':integration-oxygen-editor';

        Vite::assets()->enqueue('resources/integration/oxygen/main.js', [
            'handle' => $handle,
            'in_footer' => true,
        ]);

        wp_localize_script($handle, 'windpressoxygen', [
            '_version' => WIND_PRESS::VERSION,
            'assets' => [
                'url' => Vite::base_url(),
            ],
            'site_meta' => [
                'name' => get_bloginfo('name'),
                'site_url' => get_site_url(),
                'admin_url' => AdminPage::get_page_url(),
            ],
        ]);

        wp_add_inline_script($handle, <<<JS
            document.addEventListener('DOMContentLoaded', async function () {
                while (!document.getElementById('iframe')?.contentDocument.querySelector('#breakdance_canvas')) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                let iframeWindow = document.getElementById('iframe');

                wp.hooks.addFilter('windpressoxygen-autocomplete-items-query', 'windpressoxygen', async (autocompleteItems, text) => {
                    const windpress_suggestions = await iframeWindow.contentWindow.windpress.module.autocomplete.query(text);

                    return [...windpress_suggestions, ...autocompleteItems];
                });
            });
        JS, 'after');

        $wp_scripts = wp_scripts();

        $queue = $wp_scripts->queue;

        foreach ($queue as $handle) {
            if (strpos($handle, WIND_PRESS::WP_OPTION . ':') !== 0) {
                continue;
            }

            $wp_scripts->do_items($handle);
        }
    }
}
