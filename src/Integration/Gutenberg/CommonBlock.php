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
     * HTML elements whose contents or behavior can execute active content.
     *
     * @var string[]
     */
    private const UNSAFE_TAG_NAMES = [
        'base',
        'embed',
        'link',
        'meta',
        'noembed',
        'noframes',
        'noscript',
        'object',
        'plaintext',
        'script',
        'style',
        'xmp',
    ];

    /**
     * Global attributes that are safe to render on Common Block elements.
     *
     * @var string[]
     */
    private const SAFE_GLOBAL_ATTRIBUTES = [
        'accept',
        'accept-charset',
        'accesskey',
        'action',
        'align',
        'alt',
        'autocomplete',
        'autofocus',
        'capture',
        'checked',
        'cite',
        'cols',
        'colspan',
        'contenteditable',
        'controls',
        'datetime',
        'decoding',
        'dir',
        'disabled',
        'download',
        'draggable',
        'enctype',
        'for',
        'form',
        'formaction',
        'formenctype',
        'formmethod',
        'formnovalidate',
        'formtarget',
        'height',
        'hidden',
        'href',
        'hreflang',
        'id',
        'inputmode',
        'kind',
        'label',
        'lang',
        'loading',
        'loop',
        'max',
        'maxlength',
        'media',
        'method',
        'min',
        'minlength',
        'multiple',
        'muted',
        'name',
        'open',
        'pattern',
        'placeholder',
        'playsinline',
        'poster',
        'preload',
        'readonly',
        'rel',
        'required',
        'role',
        'rows',
        'rowspan',
        'scope',
        'selected',
        'size',
        'span',
        'src',
        'srclang',
        'start',
        'step',
        'tabindex',
        'target',
        'title',
        'type',
        'value',
        'width',
    ];

    /**
     * URL-valued attributes that require protocol validation.
     *
     * @var string[]
     */
    private const URL_ATTRIBUTES = [
        'action',
        'cite',
        'formaction',
        'href',
        'poster',
        'src',
    ];

    /**
     * Boolean HTML attributes, rendered only when their value is enabled.
     *
     * @var string[]
     */
    private const BOOLEAN_ATTRIBUTES = [
        'autofocus',
        'checked',
        'controls',
        'disabled',
        'formnovalidate',
        'hidden',
        'loop',
        'multiple',
        'muted',
        'open',
        'playsinline',
        'readonly',
        'required',
        'selected',
    ];

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
        $tag_name = $this->sanitize_tag_name($attributes['tagName'] ?? 'div');
        $content_type = is_string($attributes['contentType'] ?? null) ? $attributes['contentType'] : 'blocks';
        $global_attrs = is_array($attributes['globalAttrs'] ?? null) ? $attributes['globalAttrs'] : [];
        $text_content = is_string($attributes['content'] ?? null) ? $attributes['content'] : '';
        $self_closing_value = $attributes['selfClosing'] ?? false;
        $self_closing = is_scalar($self_closing_value) && filter_var($self_closing_value, FILTER_VALIDATE_BOOLEAN);
        $class_name = $attributes['className'] ?? '';

        // Handle cb-text-node (wrapper for TEXT_NODE in html2blocks parser)
        // Just output the text content without wrapper tags
        if ($tag_name === 'cb-text-node') {
            return esc_html($text_content);
        }

        // Build attributes array
        $attrs = [];

        // Add className if present. Escaping preserves the browser-visible class value
        // while preventing it from breaking out of the quoted attribute.
        if (is_string($class_name) && $class_name !== '') {
            $attrs['class'] = esc_attr($class_name);
        }

        // Add globalAttrs
        foreach ($global_attrs as $attr_name => $attr_value) {
            if (! is_string($attr_name) || ! is_scalar($attr_value)) {
                continue;
            }

            $attr_name = strtolower($attr_name);

            // Skip 'class' as it's handled by className
            if ($attr_name === 'class') {
                continue;
            }

            if (! $this->is_safe_global_attribute($attr_name)) {
                continue;
            }

            $is_false_value = $attr_value === false;
            $attr_value = (string) $attr_value;

            // Sanitize attribute value based on type
            if (in_array($attr_name, self::BOOLEAN_ATTRIBUTES, true)) {
                if ($is_false_value || in_array(strtolower(trim($attr_value)), ['false', '0', 'off', 'no'], true)) {
                    continue;
                }

                $attrs[$attr_name] = $attr_name;
            } elseif ($attr_name === 'style') {
                $sanitized_style = safecss_filter_attr($attr_value);
                if ($sanitized_style !== '') {
                    $attrs[$attr_name] = esc_attr($sanitized_style);
                }
            } elseif (in_array($attr_name, self::URL_ATTRIBUTES, true)) {
                $attrs[$attr_name] = esc_url($attr_value);
            } else {
                $attrs[$attr_name] = esc_attr($attr_value);
            }
        }

        // Build attribute string
        $attr_string = '';
        foreach ($attrs as $attr_name => $attr_value) {
            $attr_string .= sprintf(' %s="%s"', esc_attr($attr_name), $attr_value);
        }

        // Determine final content based on content type
        $final_content = '';
        if ($content_type === 'blocks') {
            // Use inner blocks content
            $final_content = $content;
        } elseif ($content_type === 'text') {
            // Imported text content may include inline HTML; retain only post-safe markup.
            $final_content = wp_kses_post($text_content);
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

    /**
     * Validate the requested element name and reject elements with active content behavior.
     *
     * @param mixed $tag_name Requested element name.
     * @return string Safe element name.
     */
    private function sanitize_tag_name($tag_name): string
    {
        if (! is_string($tag_name)) {
            return 'div';
        }

        $tag_name = strtolower($tag_name);

        if (! preg_match('/^[a-z][a-z0-9-]*$/', $tag_name) || in_array($tag_name, self::UNSAFE_TAG_NAMES, true)) {
            return 'div';
        }

        return $tag_name;
    }

    /**
     * Check whether a global attribute name is allowed on a Common Block element.
     *
     * @param string $attr_name Attribute name.
     * @return bool
     */
    private function is_safe_global_attribute(string $attr_name): bool
    {
        if (! preg_match('/^[a-z][a-z0-9_.:-]*$/', $attr_name) || strpos($attr_name, 'on') === 0) {
            return false;
        }

        if (preg_match('/^data-[a-z0-9_.:-]+$/', $attr_name) || preg_match('/^aria-[a-z0-9_.:-]+$/', $attr_name)) {
            return true;
        }

        return $attr_name === 'style' || in_array($attr_name, self::SAFE_GLOBAL_ATTRIBUTES, true);
    }
}
