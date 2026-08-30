<?php

/**
 * Notices class.
 *
 * @since 1.0.0
 *
 * @package EasyDigitalDownloads\Updater
 * @subpackage Admin
 */
namespace EasyDigitalDownloads\Updater\Admin;

// Exit if accessed directly.
defined('ABSPATH') || exit;
// @codeCoverageIgnore
/**
 * Class Notices
 */
class Notices
{
    /**
     * The notices.
     *
     * @var array
     */
    private static $notices = array();
    /**
     * Notices constructor.
     */
    public function __construct()
    {
        add_action('admin_notices', array($this, 'render'), 100);
    }
    /**
     * Add a notice.
     *
     * @since 1.0.0
     * @param array $args The notice arguments.
     */
    public static function add(array $args)
    {
        $args = wp_parse_args($args, array('id' => '', 'type' => 'info', 'message' => '', 'classes' => array()));
        if (empty($args['message']) || empty($args['id'])) {
            return;
        }
        $classes = array('notice');
        if (!empty($args['type'])) {
            $classes[] = 'notice-' . $args['type'];
        }
        if (!empty($args['classes'])) {
            $classes = array_merge($classes, $args['classes']);
        }
        self::$notices[$args['id']] = array('message' => $args['message'], 'classes' => $classes);
    }
    /**
     * Render the notices.
     */
    public function render()
    {
        if (empty(self::$notices)) {
            return;
        }
        foreach (self::$notices as $id => $args) {
            ?>
			<div id="<?php 
            echo esc_attr($id);
            ?>" class="<?php 
            echo esc_attr(implode(' ', $args['classes']));
            ?>">
				<p><?php 
            echo wp_kses_post($args['message']);
            ?></p>
			</div>
			<?php 
        }
    }
}
