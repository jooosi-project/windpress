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
        // If the Gutenberg provider is not found, return an empty array. Essentially, it depends on the Gutenberg provider.
        if ($gutenbergProvider === null) {
            return [];
        }
        // Gutenberg is enabled. Skip the compile process as it has been handled by the Gutenberg provider.
        if ($gutenbergProvider['enabled']) {
            return [];
        }
        // skip the content if doesn't have `etch` on the post content
        add_filter('f!windpress/integration/gutenberg/compile:get_contents.skip', function ($skip, $post) {
            if (strpos($post->post_content, 'etch') === \false) {
                return \true;
            }
            return $skip;
        }, 10, 2);
        // Use the Gutenberg compiler.
        return call_user_func(new $gutenbergProvider['callback'](), $metadata);
    }
}
