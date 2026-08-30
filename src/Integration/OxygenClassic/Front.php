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
namespace WindPress\WindPress\Integration\OxygenClassic;

use DOMXPath;
use WindPressDeps\Masterminds\HTML5;
/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Front
{
    public function __construct()
    {
        add_filter('do_shortcode_tag', fn($output, $tag) => $this->do_shortcode_tag($output, $tag), 10, 2);
    }
    public function do_shortcode_tag($output, $tag)
    {
        if (strpos($tag, 'ct_') !== 0) {
            return $output;
        }
        $html5 = new HTML5();
        try {
            $dom = $html5->loadHTML($output);
            // traverse the DOM and merge the `plainclass` attribute with the `class` attribute
            $domxPath = new DOMXPath($dom);
            $nodes = $domxPath->query('//*[@plainclass]');
            foreach ($nodes as $node) {
                $plainclass = $node->getAttribute('plainclass');
                $node->removeAttribute('plainclass');
                $class = $node->getAttribute('class');
                $node->setAttribute('class', trim($class . ' ' . $plainclass));
            }
            // save the modified HTML
            $output = $html5->saveHTML($dom);
        } catch (\Throwable $throwable) {
            //throw $th;
        }
        return $output;
    }
}
