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
namespace WindPress\WindPress\Integration\Blockstudio;

use WindPress\WindPress\Core\Runtime;
/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Editor
{
    public function __construct()
    {
        $this->editor_assets();
    }
    public function editor_assets()
    {
        /**
         * @see https://blockstudio.dev/documentation/hooks/php/#editor-markup
         */
        add_filter('blockstudio/settings/editor/markup', fn($value) => $value . Runtime::get_instance()->getVFSHtml());
        /**
         * @see https://blockstudio.dev/documentation/hooks/php/#editor-assets
         */
        add_filter('blockstudio/settings/editor/assets', fn() => ['windpress:observer']);
    }
}
