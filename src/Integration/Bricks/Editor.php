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
namespace WindPress\WindPress\Integration\Bricks;

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
        add_action('wp_enqueue_scripts', fn() => $this->editor_assets(), 1000000);
    }
    public function editor_assets()
    {
        if (!function_exists('bricks_is_builder_main') || !\bricks_is_builder_main()) {
            return;
        }
        $handle = WIND_PRESS::WP_OPTION . ':integration-bricks-editor';
        Vite::assets()->enqueue('resources/integration/bricks/main.js', ['handle' => $handle, 'in_footer' => \true]);
        wp_localize_script($handle, 'windpressbricks', ['_version' => WIND_PRESS::VERSION, 'assets' => ['url' => Vite::base_url()], 'site_meta' => ['name' => get_bloginfo('name'), 'site_url' => get_site_url(), 'admin_url' => AdminPage::get_page_url()]]);
        wp_add_inline_script($handle, <<<JS
    document.addEventListener('DOMContentLoaded', function () {
        const iframeWindow = document.getElementById('bricks-builder-iframe');

        wp.hooks.addFilter('windpressbricks-autocomplete-items-query', 'windpressbricks', async (autocompleteItems, text) => {
            const windpress_suggestions = await iframeWindow.contentWindow.windpress.module.autocomplete.query(text);

            return [...windpress_suggestions, ...autocompleteItems];
        });
    });
JS
, 'after');
    }
}
