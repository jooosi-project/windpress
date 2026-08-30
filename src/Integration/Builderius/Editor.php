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
namespace WindPress\WindPress\Integration\Builderius;

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
        /**
         * @see wp-content/plugins/builderius/plugin/loader/loader.php#L74
         */
        add_action('wp_enqueue_scripts', fn() => $this->editor_assets(), 1000001);
    }
    public function editor_assets()
    {
        if (!(isset($_GET['builderius_template']) && $_GET['builderius_template'] && isset($_GET['builderius']))) {
            return;
        }
        $handle = WIND_PRESS::WP_OPTION . ':integration-builderius-editor';
        Vite::assets()->enqueue('resources/integration/builderius/main.js', ['handle' => $handle, 'in_footer' => \true]);
        wp_register_script($handle, \false);
        wp_enqueue_script($handle);
        wp_localize_script($handle, 'windpressbuilderius', ['_version' => WIND_PRESS::VERSION, 'assets' => ['url' => Vite::base_url()], 'site_meta' => ['name' => get_bloginfo('name'), 'site_url' => get_site_url(), 'admin_url' => AdminPage::get_page_url()]]);
        wp_add_inline_script($handle, <<<JS
    document.addEventListener('DOMContentLoaded', async function () {
        while (!document.getElementById('builderInner')?.contentDocument.querySelector('#builderiusBuilder')) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        let iframeWindow = document.getElementById('builderInner');

        const suggestions = iframeWindow.contentWindow.windpress.module.autocomplete.query('').map(({ value }) => value);
        
        window.Builderius.API.store.set('externalCssClasses', {
            "value": "windpress",
            "label": "Tailwind 4",
            "pureNames": true,
            "children": suggestions
        });
    });
JS
, 'after');
    }
}
