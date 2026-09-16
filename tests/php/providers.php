<?php

declare(strict_types=1);

namespace Symfony\Component\Yaml {
    class Yaml
    {
        public static function dump(array $blocks): string
        {
            return json_encode($blocks);
        }
    }
}

namespace Bricks {
    class Database
    {
        public static array $global_settings = ['postTypes' => ['post']];
    }
}

namespace Breakdance\Data {
    function get_tree_as_html(int $post_id): string
    {
        $GLOBALS['builder_renders']++;
        return '<div class="dynamic-' . $GLOBALS['builder_renders'] . '">' . $post_id . '</div>';
    }
}

namespace MBViews\Renderer {
    class MetaBox
    {
    }
}

namespace MBViews {
    class Renderer
    {
        public function __construct($meta_box)
        {
            $GLOBALS['metabox_constructions']++;
        }

        public function render(int $post_id): string
        {
            \check($GLOBALS['post']->ID === $post_id, 'MetaBox must render in the source post context.');
            if ($GLOBALS['render_failure']) {
                throw new \RuntimeException('Broken template');
            }

            return '<div class="rendered-metabox">' . $post_id . '</div>';
        }
    }
}

namespace WindPress\WindPress\Core {
    class Cache
    {
        public static function get_providers(): array
        {
            return $GLOBALS['providers'];
        }
    }
}

namespace {
    use WindPress\WindPress\Integration\Etch\Compile as EtchCompile;
    use WindPress\WindPress\Integration\Gutenberg\Compile as GutenbergCompile;

    class WP_Post
    {
        public int $ID;

        public string $post_content;

        public string $post_type;

        public string $post_title = 'Source title';

        public function __construct(int $id, string $content, string $post_type = 'post')
        {
            $this->ID = $id;
            $this->post_content = $content;
            $this->post_type = $post_type;
        }
    }

    class WP_Query
    {
        public array $posts;
        public array $query_vars = [];

        public function query(array $arguments): array
        {
            $GLOBALS['last_query'] = $arguments;
            $this->query_vars = $arguments;
            $where = apply_filters('posts_where', '', $this);
            preg_match('/ID > (\d+) AND wp_posts.ID <= (\d+)/', $where, $bounds);
            $this->posts = array_values(array_filter($GLOBALS['source_posts'], static function (WP_Post $post) use ($arguments, $bounds): bool {
                return in_array($post->post_type, $arguments['post_type'], true)
                    && $post->ID > (int) $bounds[1] && $post->ID <= (int) $bounds[2];
            }));
            usort($this->posts, static function (WP_Post $left, WP_Post $right): int {
                return $left->ID <=> $right->ID;
            });
            $this->posts = array_slice($this->posts, ($arguments['paged'] - 1) * $arguments['posts_per_page'], $arguments['posts_per_page']);
            if (($arguments['fields'] ?? null) === 'ids') {
                $this->posts = array_map(static function (WP_Post $post): int {
                    return $post->ID;
                }, $this->posts);
            }

            return $this->posts;
        }

        public function setup_postdata(WP_Post $post): bool
        {
            $GLOBALS['id'] = $post->ID;
            return true;
        }
    }

    function check(bool $condition, string $message): void
    {
        if (! $condition) {
            throw new RuntimeException($message);
        }
    }

    function __(string $message, string $domain): string
    {
        return $message;
    }

    function apply_filters(string $hook, $value, ...$arguments)
    {
        foreach ($GLOBALS['filters'][$hook] ?? [] as $callback) {
            $value = $callback($value, ...$arguments);
        }

        return $value;
    }

    function add_filter(string $hook, callable $callback, int $priority = 10, int $accepted_args = 1): void
    {
        $GLOBALS['filters'][$hook][] = $callback;
    }

    function remove_filter(string $hook, callable $callback, int $priority = 10): void
    {
        $GLOBALS['filters'][$hook] = array_filter($GLOBALS['filters'][$hook] ?? [], static function ($existing) use ($callback): bool {
            return $existing !== $callback;
        });
    }

    function wp_json_encode($value): string
    {
        return json_encode($value);
    }

    function get_post_types(array $arguments = []): array
    {
        return ['post', 'page', 'product', 'classic', 'media'];
    }

    function post_type_supports(string $post_type, string $feature): bool
    {
        return $post_type !== 'media';
    }

    function get_option(string $name, $default = false)
    {
        return $GLOBALS['options'][$name] ?? $default;
    }

    function get_post_meta(int $post_id, string $key, bool $single = false)
    {
        return $GLOBALS['post_meta'][$post_id][$key] ?? '';
    }

    function update_meta_cache(string $type, array $ids): void
    {
    }

    function get_current_blog_id(): int
    {
        return 1;
    }

    function get_current_user_id(): int
    {
        return 1;
    }

    function get_transient(string $key)
    {
        return $GLOBALS['extraction_transients'][$key] ?? false;
    }

    function set_transient(string $key, $value, int $expiration): bool
    {
        $GLOBALS['extraction_transients'][$key] = $value;
        return true;
    }

    function has_filter(string $hook): bool
    {
        return ! empty($GLOBALS['filters'][$hook]);
    }

    function parse_blocks(string $content): array
    {
        $GLOBALS['parsed_blocks']++;
        return [['innerHTML' => $content]];
    }

    function oxygen_safe_convert_old_shortcodes_to_json(string $content): string
    {
        $GLOBALS['oxygen_conversions']++;
        return json_encode(['class' => $content]);
    }

    function do_blocks(string $content): string
    {
        if ($GLOBALS['render_failure']) {
            throw new RuntimeException('Broken dynamic block');
        }

        $GLOBALS['rendered_post_ids'][] = $GLOBALS['post']->ID;
        return '<div class="rendered-block">' . $GLOBALS['post']->ID . '</div>';
    }

    function do_shortcode(string $content): string
    {
        if ($GLOBALS['render_failure']) {
            throw new RuntimeException('Broken shortcode');
        }

        $GLOBALS['rendered_post_ids'][] = $GLOBALS['post']->ID;
        return $content . '<div class="rendered-shortcode">' . $GLOBALS['post']->ID . '</div>';
    }

    function wptexturize(string $content): string
    {
        return $content;
    }

    function convert_smilies(string $content): string
    {
        return $content;
    }

    function shortcode_unautop(string $content): string
    {
        return $content;
    }

    function wp_filter_content_tags(string $content): string
    {
        return $content;
    }

    $root = dirname(__DIR__, 2);
    require_once $root . '/constant.php';
    require_once $root . '/src/Core/Scanner/ExtractionCache.php';
    require_once $root . '/src/Core/Scanner/PostQuery.php';
    require_once $root . '/src/Core/Scanner/PostRenderer.php';
    foreach (['Gutenberg', 'GreenShift', 'LiveCanvas', 'Kadence', 'MetaBox/Views', 'Etch', 'Bricks', 'OxygenClassic', 'Elementor', 'Builderius', 'Breakdance', 'Oxygen'] as $integration) {
        require_once $root . '/src/Integration/' . $integration . '/Compile.php';
    }

    $GLOBALS['filters'] = [];
    $GLOBALS['wpdb'] = new class {
        public string $posts = 'wp_posts';

        public string $last_error = '';

        public function get_var(string $sql): int
        {
            return array_reduce($GLOBALS['source_posts'], static function (int $maximum, WP_Post $post): int {
                return max($maximum, $post->ID);
            }, 0);
        }

        public function prepare(string $sql, ...$arguments): string
        {
            return vsprintf($sql, $arguments);
        }
    };
    $GLOBALS['render_failure'] = false;
    $GLOBALS['rendered_post_ids'] = [];
    $GLOBALS['metabox_constructions'] = 0;
    $GLOBALS['parsed_blocks'] = 0;
    $GLOBALS['oxygen_conversions'] = 0;
    $GLOBALS['options'] = [];
    $GLOBALS['post_meta'] = [];
    $GLOBALS['extraction_transients'] = [];
    $GLOBALS['post'] = new WP_Post(999, 'outer context');
    $GLOBALS['id'] = 999;
    $GLOBALS['filters']['use_block_editor_for_post_type'][] = static function ($enabled, string $post_type): bool {
        return $post_type !== 'classic';
    };
    $GLOBALS['source_posts'] = [
        new WP_Post(42, '<div class="raw-product">Conditional source</div>', 'product'),
        new WP_Post(43, '<div class="raw-part">Template part</div>', 'wp_template_part'),
        new WP_Post(44, '<div class="raw-pattern">Reusable block</div>', 'wp_block'),
    ];
    $metadata = ['next_batch' => false];
    $result = (new GutenbergCompile())->get_contents($metadata);
    check(count($result['contents']) === 3, 'Gutenberg must include custom block post types, template parts, and reusable blocks.');
    check(! in_array('classic', $GLOBALS['last_query']['post_type'], true) && ! in_array('media', $GLOBALS['last_query']['post_type'], true), 'Custom post types must support and enable the block editor.');
    check(strpos($result['contents'][0]['content'], 'raw-product') !== false && strpos($result['contents'][0]['content'], 'rendered-block') !== false, 'Gutenberg must retain raw source and rendered classes.');
    check(! in_array(999, $GLOBALS['rendered_post_ids'], true), 'All render functions must use their source post context.');
    check($GLOBALS['post']->ID === 999 && $GLOBALS['id'] === 999, 'Scanning must restore the surrounding post context.');
    $parsed_before = $GLOBALS['parsed_blocks'];
    $rendered_before = count($GLOBALS['rendered_post_ids']);
    (new GutenbergCompile())->get_contents($metadata);
    check($GLOBALS['parsed_blocks'] === $parsed_before, 'Unchanged Gutenberg block parsing should reuse its extraction.');
    check(count($GLOBALS['rendered_post_ids']) > $rendered_before, 'Gutenberg dynamic rendering must still run with a warm extraction cache.');
    $GLOBALS['filters']['block_parser_class'] = [static function ($parser) { return $parser; }];
    (new GutenbergCompile())->get_contents($metadata);
    check($GLOBALS['parsed_blocks'] === $parsed_before + 3, 'Custom block parsers must run even when source text is unchanged.');

    $provider_cases = [
        ['Gutenberg', 'gutenberg', 'post', 'Gutenberg'],
        ['GreenShift', 'greenshift', 'wp_block', 'GreenShift'],
        ['LiveCanvas', 'livecanvas', 'post', 'LiveCanvas'],
        ['Kadence', 'kadence', 'kadence_element', 'Kadence'],
        ['MetaBox\\Views', 'metabox/views', 'mb-views', 'MetaBox Views'],
    ];
    foreach ($provider_cases as [$integration, $hook_name, $post_type, $provider_name]) {
        $GLOBALS['filters'] = [];
        $GLOBALS['source_posts'] = [new WP_Post(42, '<div class="raw-branch">{{ conditional }}</div>', $post_type)];
        $class = 'WindPress\\WindPress\\Integration\\' . $integration . '\\Compile';
        $render_hook = 'f!windpress/integration/' . $hook_name . '/compile:get_contents.render';
        $GLOBALS['filters'][$render_hook][] = static function (): bool { return false; };
        $result = (new $class())->get_contents($metadata);
        check($result['contents'][0]['source_id'] === 'post:42', $provider_name . ' must expose a stable post source ID.');
        check(strpos($result['contents'][0]['content'], 'raw-branch') !== false, $provider_name . ' must retain source when rendering is disabled.');

        $GLOBALS['filters'][$render_hook] = [static function (): bool { return true; }];
        if ($integration === 'Kadence') {
            $GLOBALS['filters']['f!windpress/integration/kadence/compile:get_contents.render_fn'] = [static function (): array { return ['do_blocks']; }];
        }
        $result = (new $class())->get_contents($metadata);
        check(strpos($result['contents'][0]['content'], 'raw-branch') !== false && strpos($result['contents'][0]['content'], 'rendered-') !== false, $provider_name . ' must retain both source and rendered classes.');

        $GLOBALS['render_failure'] = true;
        try {
            (new $class())->get_contents($metadata);
            throw new RuntimeException($provider_name . ' swallowed a render failure.');
        } catch (RuntimeException $exception) {
            check(strpos($exception->getMessage(), $provider_name) !== false && strpos($exception->getMessage(), '#42') !== false, 'Provider errors must identify the failed source.');
        }
        check($GLOBALS['post']->ID === 999 && $GLOBALS['id'] === 999, 'Provider failure must restore context.');
        $GLOBALS['render_failure'] = false;
    }

    $GLOBALS['filters'] = ['f!windpress/integration/gutenberg/compile:get_contents.render' => [static function (): bool { return false; }]];
    $GLOBALS['source_posts'] = [new WP_Post(42, '<!-- etch --> etch-source'), new WP_Post(43, 'ordinary-source')];
    foreach ([false, true] as $gutenberg_enabled) {
        $GLOBALS['providers'] = [['id' => 'gutenberg', 'enabled' => $gutenberg_enabled, 'callback' => static function (): array { return []; }]];
        $etch_result = (new EtchCompile())($metadata);
        check(count($etch_result['contents']) === 1 && $etch_result['contents'][0]['id'] === 42, 'Etch must scan when Gutenberg compilation is disabled regardless of its integration toggle.');
    }
    $GLOBALS['providers'] = [['id' => 'gutenberg', 'enabled' => false, 'callback' => GutenbergCompile::class]];
    check(count((new EtchCompile())($metadata)['contents']) === 1, 'Etch must scan when the Gutenberg integration is disabled.');
    $GLOBALS['providers'] = [];
    check(count((new EtchCompile())($metadata)['contents']) === 1, 'Etch must work even when the Gutenberg provider is not registered.');
    check(count((new GutenbergCompile())($metadata)['contents']) === 2, 'Etch must not leave a skip filter affecting later Gutenberg scans.');
    $GLOBALS['providers'] = [['id' => 'gutenberg', 'enabled' => true, 'callback' => GutenbergCompile::class]];
    check((new EtchCompile())($metadata) === [], 'Etch should defer when the active Gutenberg extractor scans the same sources.');

    $GLOBALS['providers'] = [];
    $GLOBALS['filters']['f!windpress/core/scanner:batch_size'] = [static function (): int { return 2; }];
    $GLOBALS['source_posts'] = [new WP_Post(1, 'ordinary'), new WP_Post(2, 'ordinary'), new WP_Post(3, '<!-- etch --> matching-source')];
    $first_batch = (new EtchCompile())($metadata);
    check($first_batch['contents'] === [] && is_string($first_batch['metadata']['next_batch']), 'A batch with no Etch matches must preserve its scan cursor.');
    $second_batch = (new EtchCompile())($first_batch['metadata']);
    check(count($second_batch['contents']) === 1 && $second_batch['contents'][0]['id'] === 3, 'Etch must continue through filtered batches to find later sources.');

    define('BRICKS_VERSION', 'test-version');
    define('BRICKS_DB_PAGE_HEADER', 'bricks_header');
    define('BRICKS_DB_PAGE_CONTENT', 'bricks_content');
    define('BRICKS_DB_PAGE_FOOTER', 'bricks_footer');
    define('BRICKS_DB_TEMPLATE_SLUG', 'bricks_template');
    define('BRICKS_DB_GLOBAL_CLASSES', 'bricks_global_classes');
    $GLOBALS['filters'] = [];
    $GLOBALS['source_posts'] = [new WP_Post(42, 'unchanged post content')];
    $GLOBALS['options'][BRICKS_DB_GLOBAL_CLASSES] = [['id' => 'global', 'name' => 'text-red-500']];
    $node = [['settings' => ['_cssGlobalClasses' => ['global']]]];
    $GLOBALS['post_meta'][42] = [BRICKS_DB_PAGE_HEADER => $node, BRICKS_DB_PAGE_CONTENT => $node];
    $GLOBALS['options']['bricks_components'] = [['elements' => $node]];
    $bricks = new class extends \WindPress\WindPress\Integration\Bricks\Compile {
        public int $transformations = 0;

        public function transform_meta_value(array $meta_value): array
        {
            $this->transformations++;
            return parent::transform_meta_value($meta_value);
        }
    };
    $first = $bricks($metadata);
    $ids = array_column($first['contents'], 'source_id');
    check(count($ids) === count(array_unique($ids)), 'Bricks fragments must have unique stable source IDs.');
    check($ids === ['post:42:meta:bricks_header', 'post:42:meta:bricks_content', 'option:bricks_components'], 'Bricks IDs must distinguish meta fragments and global components.');
    $bricks($metadata);
    check($bricks->transformations === 3, 'A warm Bricks scan must reuse all unchanged transforms.');
    $GLOBALS['post_meta'][42][BRICKS_DB_PAGE_CONTENT][0]['settings']['_cssClasses'] = 'p-9';
    $changed = $bricks($metadata);
    check($bricks->transformations === 4 && $changed['contents'][1]['content'][0]['settings']['_cssClasses'] === 'p-9', 'Meta-only edits must refresh the affected Bricks extraction.');
    $GLOBALS['options'][BRICKS_DB_GLOBAL_CLASSES][0]['name'] = 'text-blue-500';
    $changed = $bricks($metadata);
    check($bricks->transformations === 7, 'Global class changes must refresh dependent posts and components.');
    check($changed['contents'][0]['content'][0]['settings']['_cssGlobalClasses'] === ['text-blue-500'], 'Global class names must not remain stale.');
    unset($GLOBALS['post_meta'][42][BRICKS_DB_PAGE_HEADER]);
    $removed = $bricks($metadata);
    check(! in_array('post:42:meta:bricks_header', array_column($removed['contents'], 'source_id'), true), 'Deleted metadata must disappear from the current source manifest.');
    $GLOBALS['source_posts'] = [];
    $removed = $bricks($metadata);
    check(array_column($removed['contents'], 'source_id') === ['option:bricks_components'], 'Posts leaving the current query must not reappear from the extraction cache.');

    $oxygen = new \WindPress\WindPress\Integration\OxygenClassic\Compile();
    $GLOBALS['post_meta'][42] = ['ct_builder_shortcodes' => 'legacy-source'];
    $GLOBALS['shortcode_tags'] = ['ct_section' => true];
    $first = $oxygen->get_post_metas(42);
    $oxygen->get_post_metas(42);
    check($first[0]['source_id'] === 'post:42' && $GLOBALS['oxygen_conversions'] === 1, 'Deterministic Oxygen legacy conversion should be cached by stable source ID.');
    $GLOBALS['post_meta'][42]['ct_builder_shortcodes'] = 'edited-meta';
    $oxygen->get_post_metas(42);
    check($GLOBALS['oxygen_conversions'] === 2, 'Oxygen meta-only edits must refresh conversion.');
    $GLOBALS['shortcode_tags']['ct_text'] = true;
    $oxygen->get_post_metas(42);
    check($GLOBALS['oxygen_conversions'] === 3, 'The shortcode registry must invalidate Oxygen conversion.');
    $GLOBALS['filters']['oxy_base64_encode_options'] = [static function ($value) { return $value; }];
    $oxygen->get_post_metas(42);
    $oxygen->get_post_metas(42);
    check($GLOBALS['oxygen_conversions'] === 5, 'Custom Oxygen decoder filters must not be bypassed by caching.');
    unset($GLOBALS['filters']['oxy_base64_encode_options']);
    $GLOBALS['options']['oxygen_vsb_enable_signature_validation'] = true;
    $oxygen->get_post_metas(42);
    $oxygen->get_post_metas(42);
    check($GLOBALS['oxygen_conversions'] === 7, 'Signature-dependent Oxygen conversion must run fresh.');

    $GLOBALS['post_meta'][42] = ['_elementor_data' => '[]', 'content_config' => '{}'];
    check((new \WindPress\WindPress\Integration\Elementor\Compile())->get_post_metas(42)[0]['source_id'] === 'post:42:meta:_elementor_data', 'Elementor must identify its meta source.');
    check((new \WindPress\WindPress\Integration\Builderius\Compile())->get_post_metas(42)[0]['source_id'] === 'post:42:meta:content_config', 'Builderius must identify its meta source.');

    $GLOBALS['builder_renders'] = 0;
    foreach ([new \WindPress\WindPress\Integration\Breakdance\Compile(), new \WindPress\WindPress\Integration\Oxygen\Compile()] as $builder) {
        $first = $builder->get_post_metas(42);
        $second = $builder->get_post_metas(42);
        check($first[0]['source_id'] === 'post:42' && $second[0]['source_id'] === 'post:42', 'Rendered builders must retain stable source IDs.');
        check($first[0]['content'] !== $second[0]['content'], 'Dynamic builder output must never reuse the deterministic extraction cache.');
    }

    echo "Provider tests passed.\n";
}
