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
namespace WindPress\WindPress\Integration\Timber;

use WindPressDeps\Symfony\Component\Finder\Finder;
use Timber\LocationManager;
use Timber\Timber;
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
        if (!class_exists(Timber::class)) {
            return [];
        }
        return $this->get_contents($metadata);
    }
    public function get_contents($metadata): array
    {
        $contents = [];
        $paths = LocationManager::get_locations();
        $paths = array_unique(array_filter(array_merge(...array_values($paths)), fn($path) => $path !== '/'));
        $finder = new Finder();
        $finder->in($paths);
        $finder->files()->name('*.twig');
        do_action('a!windpress/integration/timber/compile:get_contents.finder', $finder);
        foreach ($finder as $file) {
            $template_file = $file->getPathname();
            if (!is_readable($template_file)) {
                continue;
            }
            $contents[] = ['name' => $file->getRelativePathname(), 'content' => $file->getContents()];
        }
        return ['metadata' => ['next_batch' => \false, 'total_batches' => 1], 'contents' => $contents];
    }
}
