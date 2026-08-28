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

namespace WindPress\WindPress\Integration\LiveCanvas;

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
        add_action('lc_editor_before_body_closing', fn () => $this->register_livecanvas_autocomplete(), 1_000_001);
    }

    public function register_livecanvas_autocomplete()
    {
        $handle = WIND_PRESS::WP_OPTION . ':integration-livecanvas-editor';

        Vite::assets()->enqueue('resources/integration/livecanvas/main.js', [
            'handle' => $handle,
            'in_footer' => true,
            'dependencies' => ['wp-hooks']
        ]);

        wp_localize_script($handle, 'windpresslivecanvas', [
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
