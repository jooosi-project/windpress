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

namespace WindPress\WindPress\Integration\Blockstudio;

use Blockstudio\Build;
use WindPress\WindPress\Core\Scanner\FileScanner;

/**
 * @author Joshua Gugun Siagian <suabahasa@gmail.com>
 */
class Compile
{
    /**
     * @param array $metadata
     */
    public function __invoke($metadata): array
    {
        if (! class_exists(Build::class)) {
            return [];
        }

        return $this->get_contents($metadata);
    }

    public function get_contents($metadata): array
    {
        return FileScanner::scan_files('blockstudio', static function (): \Generator {
            foreach (Build::data() as $block) {
                foreach ($block['filesPaths'] as $path) {
                    yield [
                        'path' => $path,
                        'name' => $path,
                        'type' => pathinfo($path, PATHINFO_EXTENSION) === 'json' ? 'json' : null,
                    ];
                }
            }
        }, $metadata['next_batch'] ?? false);
    }
}
