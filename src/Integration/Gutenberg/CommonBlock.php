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

namespace WindPress\WindPress\Integration\Gutenberg;

use enshrined\svgSanitize\Sanitizer;
use WIND_PRESS;
use WindPress\WindPress\Utils\Config;
use WindPress\WindPress\Utils\Vite;

/**
 * Common Block - A generic block that can be any HTML element.
 *
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * TODO:
 * - clean up the logging and unecessary comments from the current staged git changes
 * - clean up the code from the current staged git changes
 */
class CommonBlock
{
    /**
     * Stores the instance, implementing a Singleton pattern.
     */
    private static self $instance;

    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private function __construct()
    {
        // Only register if Common Block is enabled
        if (Config::get('integration.gutenberg.settings.common_block', true)) {
            add_action('init', fn() => $this->register_block());
            add_filter('block_default_classname', fn($class, $block_name) => $this->remove_default_class($class, $block_name), 10, 2);
            add_filter('f!windpress/core/runtime:enqueue_play_modules.loaded_modules', fn($modules) => $this->enqueue_isolate_styles($modules));
        }
    }

    /**
     * Singletons should not be cloneable.
     */
    private function __clone() {}

    /**
     * Singletons should not be restorable from strings.
     *
     * @throws \Exception Cannot unserialize a singleton.
     */
    public function __wakeup()
    {
        throw new \Exception('Cannot unserialize a singleton.');
    }

    /**
     * This is the static method that controls the access to the singleton
     * instance. On the first run, it creates a singleton object and places it
     * into the static property. On subsequent runs, it returns the client existing
     * object stored in the static property.
     */
    public static function get_instance(): self
    {
        if (! isset(self::$instance)) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    /**
     * Enqueue the isolate-styles module
     * This module prevents Gutenberg styles from affecting Common Blocks
     *
     * @param array $modules List of loaded modules
     * @return array Modified list of modules
     */
    public function enqueue_isolate_styles($modules)
    {
        Vite::assets()->enqueue('resources/integration/gutenberg/common-block/isolate-styles.js', [
            'handle' => WIND_PRESS::WP_OPTION . ':gutenberg-editor-isolate-styles',
            'in_footer' => true,
        ]);

        $modules[] = WIND_PRESS::WP_OPTION . ':gutenberg-editor-isolate-styles';

        return $modules;
    }

    /**
     * Register the Common Block
     */
    public function register_block()
    {
        // Register block with render callback
        // The block is registered via JavaScript (index.jsx) with edit and save functions
        // We only add the render_callback here to override the default rendering
        register_block_type('windpress/common-block', [
            'render_callback' => fn($attributes, $content, $block) => $this->render_callback($attributes, $content, $block),
        ]);
    }

    /**
     * Remove WordPress default block class to output clean HTML
     *
     * @param string $class The default block class
     * @param string $block_name The block name
     * @return string
     */
    public function remove_default_class($class, $block_name)
    {
        if ($block_name === 'windpress/common-block') {
            return '';
        }
        return $class;
    }

    /**
     * Render callback for the block
     *
     * @param array $attributes Block attributes
     * @param string $content Block inner content
     * @param object $block Block object
     * @return string
     */
    public function render_callback($attributes, $content, $block)
    {
        $tag_name = $attributes['tagName'] ?? 'div';
        $content_type = $attributes['contentType'] ?? 'blocks';
        $global_attrs = $attributes['globalAttrs'] ?? [];
        $text_content = $attributes['content'] ?? '';
        $self_closing = $attributes['selfClosing'] ?? false;
        $class_name = $attributes['className'] ?? '';

        // Handle cb-text-node (wrapper for TEXT_NODE in html2blocks parser)
        // Just output the text content without wrapper tags
        if ($tag_name === 'cb-text-node') {
            return $text_content;
        }

        // Sanitize tag name (allow only alphanumeric, dash, and custom elements with dash)
        $tag_name = preg_replace('/[^a-zA-Z0-9\-]/', '', $tag_name);

        // Build attributes array
        $attrs = [];

        // Add className if present
        // Decode HTML entities to preserve arbitrary variants like [&>img]:rounded-lg
        // Apply decoding twice to handle double-encoded entities (e.g., &amp;amp; -> &amp; -> &)
        if (!empty($class_name)) {
            $decoded_class = html_entity_decode($class_name, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $decoded_class = html_entity_decode($decoded_class, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $attrs['class'] = $decoded_class;
        }

        // Add globalAttrs
        foreach ($global_attrs as $attr_name => $attr_value) {
            // Skip 'class' as it's handled by className
            if ($attr_name === 'class') {
                continue;
            }

            // Sanitize attribute name (only alphanumeric, dash, underscore, at, and colon)
            // $attr_name = sanitize_key($attr_name);
            $attr_name = preg_replace('/[^a-zA-Z0-9\-\_\:\@]/', '', $attr_name);

            // Sanitize attribute value based on type
            if ($attr_name === 'href' || $attr_name === 'src') {
                $attrs[$attr_name] = esc_url($attr_value);
            } else {
                $attrs[$attr_name] = esc_attr($attr_value);
            }
        }

        // Build attribute string
        $attr_string = '';
        foreach ($attrs as $attr_name => $attr_value) {
            $attr_string .= sprintf(' %s="%s"', $attr_name, $attr_value);
        }

        // Determine final content based on content type
        $final_content = '';
        if ($content_type === 'blocks') {
            // Use inner blocks content
            $final_content = $content;
        } elseif ($content_type === 'text') {
            // Use text content (already sanitized by WordPress)
            $final_content = $text_content;
        } elseif ($content_type === 'html') {
            // For SVG elements, use SVG sanitizer
            if ($tag_name === 'svg') {
                // Build complete SVG with wrapper for sanitization
                $svg_wrapper = sprintf('<%s%s>%s</%s>', $tag_name, $attr_string, $text_content, $tag_name);

                $sanitizer = new Sanitizer();
                $sanitizer->removeRemoteReferences(true); // Remove external references for security
                $sanitized_svg = $sanitizer->sanitize($svg_wrapper);

                // If sanitization failed, use empty string
                if ($sanitized_svg === false) {
                    $final_content = '';
                } else {
                    // Extract inner content from sanitized SVG
                    // Remove the outer <svg> wrapper that we added
                    $dom = new \DOMDocument();
                    @$dom->loadXML($sanitized_svg);
                    $svg_element = $dom->getElementsByTagName('svg')->item(0);

                    if ($svg_element) {
                        // Get inner HTML of the SVG element
                        $inner_html = '';
                        foreach ($svg_element->childNodes as $child) {
                            $inner_html .= $dom->saveXML($child);
                        }
                        $final_content = $inner_html;
                    } else {
                        $final_content = '';
                    }
                }
            } else {
                // Use wp_kses_post for other HTML content
                $final_content = wp_kses_post($text_content);
            }
        }
        // 'empty' content type has no content

        // Render the element
        if ($self_closing || in_array($tag_name, ['img', 'input', 'br', 'hr', 'meta', 'link'])) {
            $html = sprintf('<%s%s />', esc_attr($tag_name), $attr_string);
        } else {
            $html = sprintf(
                '<%s%s>%s</%s>',
                esc_attr($tag_name),
                $attr_string,
                $final_content,
                esc_attr($tag_name)
            );
        }

        /**
         * Filter the rendered HTML before returning.
         *
         * This allows custom render logic to be applied, such as:
         * - Template engine compilation (Twig, Blade, Latte, etc.)
         * - Additional processing or transformations
         * - Custom HTML sanitization
         *
         * Example usage with Picowind's render_string():
         *
         * add_filter('f!windpress/integration/gutenberg/common_block:render', function($html, $attributes, $content) {
         *     if (function_exists('\Picowind\render_string') && function_exists('\Picowind\context')) {
         *         $context = \Picowind\context();
         *         return \Picowind\render_string($html, $context, 'twig', false);
         *     }
         *     return $html;
         * }, 10, 3);
         *
         * @param string $html The rendered HTML
         * @param array $attributes Block attributes
         * @param string $content Inner blocks content
         * @return string Modified HTML
         */
        return apply_filters('f!windpress/integration/gutenberg/common_block:render', $html, $attributes, $content);
    }
}
