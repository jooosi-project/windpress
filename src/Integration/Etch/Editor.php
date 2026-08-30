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
namespace WindPress\WindPress\Integration\Etch;

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
        add_action('wp_enqueue_scripts', fn() => $this->editor_assets(), 1000001);
    }
    public function editor_assets()
    {
        if (!(isset($_GET['etch']) && $_GET['etch'] === 'magic')) {
            return;
        }
        $handle = WIND_PRESS::WP_OPTION . ':integration-etch-editor';
        Vite::assets()->enqueue('resources/integration/etch/main.js', ['handle' => $handle, 'in_footer' => \true]);
        wp_register_script($handle, \false);
        wp_enqueue_script($handle);
        wp_localize_script($handle, 'windpressetch', ['_version' => WIND_PRESS::VERSION, 'assets' => ['url' => Vite::base_url()], 'site_meta' => ['name' => get_bloginfo('name'), 'site_url' => get_site_url(), 'admin_url' => AdminPage::get_page_url()]]);
        wp_add_inline_script($handle, <<<JS
    // add __windpress__disable_playObserver to window if not exists
    if (typeof window.__windpress__disable_playObserver === 'undefined') {
        window.__windpress__disable_playObserver = true;
    }

    document.addEventListener('DOMContentLoaded', async function () {
        let iframeWindow = document.getElementById('etch-iframe');
        
        // wait for the iframe to be ready
        while (
            !iframeWindow ||
            (iframeWindow.contentDocument?.body?.innerHTML === '' || iframeWindow.contentDocument?.body?.innerHTML === undefined)
            || (iframeWindow.contentWindow?.document?.body?.innerHTML === '' || iframeWindow.contentWindow?.document?.body?.innerHTML === undefined)
        ) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        wp.hooks.addFilter('windpressetch-autocomplete-items-query', 'windpressetch', async (autocompleteItems, text) => {
            const windpress_suggestions = await iframeWindow.contentWindow.windpress.module.autocomplete.query(text);

            return [...windpress_suggestions, ...autocompleteItems];
        });
    });
JS
, 'after');
    }
}
