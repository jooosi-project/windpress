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
namespace WindPress\WindPress\Integration\Etch;

use WindPress\WindPress\Core\Cache as CoreCache;
use WindPress\WindPress\Integration\Gutenberg\Compile as GutenbergCompile;
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
        $providers = CoreCache::get_providers();
        $gutenbergProvider = array_values(array_filter($providers, fn($provider) => $provider['id'] === 'gutenberg'))[0] ?? null;
        // Only defer when Gutenberg's extractor will actually run.
        if ($gutenbergProvider !== null && $gutenbergProvider['enabled'] && is_string($gutenbergProvider['callback']) && is_a($gutenbergProvider['callback'], GutenbergCompile::class, \true)) {
            return [];
        }
        return (new GutenbergCompile())->get_contents($metadata, static function ($post): bool {
            return strpos($post->post_content, 'etch') !== \false;
        });
    }
}
