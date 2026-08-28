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

namespace WindPress\WindPress\Integration\Breakdance;

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
        if (! defined('__BREAKDANCE_VERSION') || (defined('BREAKDANCE_MODE') && BREAKDANCE_MODE !== 'breakdance')) {
            return;
        }

        /**
         * @see wp-content/plugins/breakdance/plugin/loader/loader.php#L74
         */
        add_action('unofficial_i_am_kevin_geary_master_of_all_things_css_and_html', fn () => $this->editor_assets(), 1_000_001);
    }

    public function editor_assets()
    {
        if (! (isset($_GET['breakdance']) && $_GET['breakdance'] === 'builder')) {
            return;
        }

        // Manually enqueue the assets since Breakdance doesn't wp_head.
        add_filter('f!windpress/core/runtime:append_header.ubiquitous_panel.is_prevent_load', static fn ($is_prevent_load) => true);
        $this->load_windpress_head_assets();

        $handle = WIND_PRESS::WP_OPTION . ':integration-breakdance-editor';

        Vite::assets()->enqueue('resources/integration/breakdance/main.js', [
            'handle' => $handle,
            'in_footer' => true,
        ]);

        wp_localize_script($handle, 'windpressbreakdance', [
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

                wp.hooks.addFilter('windpressbreakdance-autocomplete-items-query', 'windpressbreakdance', async (autocompleteItems, text) => {
                    const windpress_suggestions = await iframeWindow.contentWindow.windpress.module.autocomplete.query(text);

                    return [...windpress_suggestions, ...autocompleteItems];
                });
            });
        JS, 'after');

        $this->print_queued_windpress_assets();
    }

    private function load_windpress_head_assets(): void
    {
        global $wp_filter;

        $callbacks_before = [];

        if (isset($wp_filter['wp_head']) && isset($wp_filter['wp_head']->callbacks) && is_array($wp_filter['wp_head']->callbacks)) {
            $callbacks_before = $wp_filter['wp_head']->callbacks;
        }

        Runtime::get_instance()->append_header();

        if (! isset($wp_filter['wp_head']) || ! isset($wp_filter['wp_head']->callbacks) || ! is_array($wp_filter['wp_head']->callbacks)) {
            return;
        }

        foreach ($wp_filter['wp_head']->callbacks as $priority => $callbacks) {
            foreach ($callbacks as $callback_id => $callback) {
                if (isset($callbacks_before[$priority][$callback_id])) {
                    continue;
                }

                $function = $callback['function'] ?? null;

                if (! is_callable($function)) {
                    continue;
                }

                call_user_func($function);
                remove_action('wp_head', $function, (int) $priority);
            }
        }
    }

    private function print_queued_windpress_assets(): void
    {
        $wp_styles = wp_styles();

        foreach ($wp_styles->queue as $handle) {
            if (! $this->is_windpress_handle($handle)) {
                continue;
            }

            $wp_styles->do_items($handle);
        }

        $wp_scripts = wp_scripts();

        foreach ($wp_scripts->queue as $handle) {
            if (! $this->is_windpress_handle($handle)) {
                continue;
            }

            $wp_scripts->do_items($handle);
        }
    }

    private function is_windpress_handle(string $handle): bool
    {
        return strpos($handle, WIND_PRESS::WP_OPTION) === 0;
    }
}
