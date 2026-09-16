<?php

declare(strict_types=1);

use WindPress\WindPress\Core\Scanner\PostRenderer;

require_once dirname(__DIR__, 2) . '/src/Core/Scanner/PostRenderer.php';

class WP_Post
{
    public int $ID;

    public string $post_content;

    public function __construct(int $id, string $content)
    {
        $this->ID = $id;
        $this->post_content = $content;
    }
}

class WP_Query
{
    public bool $setup_success = true;

    public function setup_postdata(WP_Post $post): bool
    {
        foreach (['id', 'authordata', 'currentday', 'currentmonth', 'page', 'pages', 'multipage', 'more', 'numpages'] as $name) {
            $GLOBALS[$name] = $post->ID;
        }

        return $this->setup_success;
    }
}

function __(string $message, string $domain): string
{
    return $message;
}

function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

$original_post = new WP_Post(999, 'original');
$GLOBALS['post'] = $original_post;
$GLOBALS['id'] = 999;
$GLOBALS['authordata'] = null;
$GLOBALS['pages'] = ['original page'];
unset($GLOBALS['currentday'], $GLOBALS['currentmonth'], $GLOBALS['page'], $GLOBALS['multipage'], $GLOBALS['more'], $GLOBALS['numpages']);

$source_post = new WP_Post(42, '<div class="hidden-branch">{{ conditional }}</div>');
$query = new WP_Query();
$result = PostRenderer::render($source_post, [static function (string $content): string {
    check($GLOBALS['post']->ID === 42 && $GLOBALS['id'] === 42, 'Renderer must see the source post.');

    return '<div class="rendered-branch">post-' . $GLOBALS['post']->ID . '</div>';
}], 'Test provider', $query);

check(strpos($result, 'hidden-branch') !== false && strpos($result, 'rendered-branch') !== false, 'Raw and rendered branches must both be scanned.');
check($GLOBALS['post'] === $original_post && $GLOBALS['id'] === 999, 'Original post context must be restored.');
check(array_key_exists('authordata', $GLOBALS) && $GLOBALS['authordata'] === null, 'Existing null globals must stay present.');
check($GLOBALS['pages'] === ['original page'] && ! array_key_exists('currentday', $GLOBALS), 'Template globals and missing globals must be restored.');

$render_error = new RuntimeException('Broken dynamic block');
try {
    PostRenderer::render($source_post, [static function () use ($render_error): string {
        $GLOBALS['post'] = new WP_Post(123, 'changed');
        $GLOBALS['pages'] = ['changed'];
        throw $render_error;
    }], 'Gutenberg', $query);
    throw new RuntimeException('A render failure must abort the scan.');
} catch (RuntimeException $exception) {
    check($exception->getPrevious() === $render_error, 'Render exceptions must preserve the cause.');
    check(strpos($exception->getMessage(), 'Gutenberg') !== false && strpos($exception->getMessage(), '#42') !== false, 'Render exceptions must identify the provider and post.');
}

check($GLOBALS['post'] === $original_post && $GLOBALS['pages'] === ['original page'], 'Failure must restore original globals.');
check(! array_key_exists('numpages', $GLOBALS), 'Failure must remove globals created during rendering.');

try {
    PostRenderer::render($source_post, [static function () {
        return null;
    }], 'Invalid renderer', $query);
    throw new RuntimeException('Invalid renderer output must abort the scan.');
} catch (RuntimeException $exception) {
    check(strpos($exception->getMessage(), 'must return a string') !== false, 'Invalid renderer output should have a contextual error.');
}

$query->setup_success = false;
try {
    PostRenderer::render($source_post, ['strtoupper'], 'Setup failure', $query);
    throw new RuntimeException('Failed context setup must abort the scan.');
} catch (RuntimeException $exception) {
    check(strpos($exception->getMessage(), 'post context') !== false, 'Context setup failures must be reported.');
}

check($GLOBALS['post'] === $original_post && $GLOBALS['id'] === 999, 'Failed setup must restore context.');
check(PostRenderer::render($source_post, [], 'No renderers', $query) === $source_post->post_content, 'An empty pipeline must preserve source without setting up context.');

echo "PostRenderer tests passed.\n";
