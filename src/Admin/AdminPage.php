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

namespace WindPress\WindPress\Admin;

use WIND_PRESS;
use WindPress\WindPress\Core\Runtime;
use WindPress\WindPress\Utils\Vite;

class AdminPage
{
    public function __construct()
    {
        add_action('admin_menu', fn() => $this->add_admin_menu(), 1_000_001);
    }

    public static function get_page_url(): string
    {
        return add_query_arg([
            'page' => WIND_PRESS::WP_OPTION,
        ], admin_url('admin.php'));
    }

    public function add_admin_menu()
    {
        $hook = add_menu_page(
            __('WindPress', 'windpress'),
            __('WindPress', 'windpress'),
            'manage_options',
            WIND_PRESS::WP_OPTION,
            fn() => $this->render(),
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file
            'data:image/svg+xml;base64,' . base64_encode(file_get_contents(dirname(WIND_PRESS::FILE) . '/windpress.svg')),
            1_000_001
        );

        add_action('load-' . $hook, fn() => $this->init_hooks());
    }

    private function render()
    {
        do_action('a!windpress/admin/admin_page:render.before');
        echo '<div id="windpress-app" class=""></div>';
        do_action('a!windpress/admin/admin_page:render.after');
    }

    private function init_hooks()
    {
        add_filter('f!windpress/core/runtime:print_windpress_metadata', fn($metadata) => $this->print_windpress_metadata($metadata), 1_000_001);
        add_action('admin_enqueue_scripts', fn() => Runtime::get_instance()->print_windpress_metadata(), 1_000_001);
        add_action('admin_enqueue_scripts', fn() => $this->enqueue_scripts(), 1_000_001);
    }

    private function enqueue_scripts()
    {
        do_action('a!windpress/admin/admin_page:enqueue_scripts.before');

        $handle = WIND_PRESS::WP_OPTION . '-admin';

        $i18n_src = Vite::base_url('wp-i18n.js');

        if (! is_file(dirname(WIND_PRESS::FILE) . '/assets/dist/wp-i18n.js')) {
            $i18n_src = plugins_url('resources/wp-i18n.js', WIND_PRESS::FILE);
        }

        wp_enqueue_script($handle . '-i18n', $i18n_src, ['wp-i18n'], null);
        wp_set_script_translations($handle . '-i18n', 'windpress');

        Vite::assets()->enqueue('resources/dashboard/main.ts', [
            'handle' => $handle,
            'in_footer' => true,
            'dependencies' => ['wp-hooks'],
        ]);

        do_action('a!windpress/admin/admin_page:enqueue_scripts.after');
    }

    function print_windpress_metadata($metadata)
    {
        $current_user = wp_get_current_user();

        $metadata['is_ubiquitous'] = false;
        $metadata['current_user'] = [
            'name' => $current_user->display_name,
            'avatar' => get_avatar_url($current_user->ID),
            'role' => $current_user->roles[0],
        ];

        return $metadata;
    }
}
