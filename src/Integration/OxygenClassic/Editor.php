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

namespace WindPress\WindPress\Integration\OxygenClassic;

use WIND_PRESS;
use WindPress\WindPress\Admin\AdminPage;
use WindPress\WindPress\Utils\Vite;

/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Editor
{
    public function __construct()
    {
        add_action('oxygen_enqueue_iframe_scripts', fn () => $this->iframe_assets(), 1_000_000);
        add_action('oxygen_enqueue_ui_scripts', fn () => $this->editor_assets(), 1_000_000);
    }

    public function iframe_assets()
    {
        $handle = WIND_PRESS::WP_OPTION . ':integration-oxygen-classic-iframe';

        Vite::assets()->enqueue('resources/integration/oxygen-classic/iframe/main.js', [
            'handle' => $handle,
            'in_footer' => true,
        ]);
    }

    public function editor_assets()
    {
        $handle = WIND_PRESS::WP_OPTION . ':integration-oxygen-classic-editor';

        Vite::assets()->enqueue('resources/integration/oxygen-classic/editor/main.js', [
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
            document.addEventListener('DOMContentLoaded', function () {
                const iframeWindow = document.getElementById('ct-artificial-viewport');

                wp.hooks.addFilter('windpressoxygen-autocomplete-items-query', 'windpressoxygen', async (autocompleteItems, text) => {
                    const windpress_suggestions = await iframeWindow.contentWindow.windpress.module.autocomplete.query(text).map((s) => {
                        return {
                            value: s.value,
                            color: s.color,
                        };
                    });

                    return [...windpress_suggestions, ...autocompleteItems];
                });
            });
        JS, 'after');
    }
}
