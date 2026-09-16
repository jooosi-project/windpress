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

namespace WindPress\WindPress\Core\Scanner;

use RuntimeException;
use Throwable;
use WP_Post;
use WP_Query;

class PostRenderer
{
    private const POST_GLOBALS = [
        'post',
        'id',
        'authordata',
        'currentday',
        'currentmonth',
        'page',
        'pages',
        'multipage',
        'more',
        'numpages',
    ];

    public static function render(WP_Post $post, array $renderers, string $provider, WP_Query $query): string
    {
        if ($renderers === []) {
            return $post->post_content;
        }

        $previous_globals = [];

        foreach (self::POST_GLOBALS as $name) {
            if (array_key_exists($name, $GLOBALS)) {
                $previous_globals[$name] = $GLOBALS[$name];
            }
        }

        $source_content = $post->post_content;
        $content = $source_content;

        try {
            $GLOBALS['post'] = $post;

            if (! $query->setup_postdata($post)) {
                throw new RuntimeException(__('Could not set up the post context.', 'windpress'));
            }

            foreach ($renderers as $renderer) {
                $content = $renderer($content);

                if (! is_string($content)) {
                    throw new RuntimeException(__('The renderer must return a string.', 'windpress'));
                }
            }
        } catch (Throwable $throwable) {
            throw new RuntimeException(sprintf(
                /* translators: 1: Scan provider name, 2: Post ID, 3: Error message. */
                __('%1$s could not render post #%2$d: %3$s', 'windpress'),
                $provider,
                $post->ID,
                $throwable->getMessage()
            ), 0, $throwable);
        } finally {
            // REST requests have no main loop to restore with wp_reset_postdata().
            foreach (self::POST_GLOBALS as $name) {
                if (array_key_exists($name, $previous_globals)) {
                    $GLOBALS[$name] = $previous_globals[$name];
                } else {
                    unset($GLOBALS[$name]);
                }
            }
        }

        // Keep classes in conditional template branches that did not render.
        return $content === $source_content ? $content : $source_content . PHP_EOL . $content;
    }
}
