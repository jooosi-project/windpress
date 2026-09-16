<?php

declare(strict_types=1);

namespace WindPress\WindPress\Core\Scanner;

use Symfony\Component\Finder\Glob;

/**
 * Resumable file discovery and bounded content reads.
 */
class FileScanner
{
    private const CURSOR_TTL = 900;

    public static function scan_local(string $root, array $patterns, array $exclude_patterns = [], $cursor = false, bool $batched = true, array $limits = []): array
    {
        $configuration = self::local_configuration($root, $patterns, $exclude_patterns);
        [$root, $patterns, $exclude_patterns, $allowed_roots] = $configuration;
        $scope = self::configuration_scope($configuration);

        return self::scan($scope, $cursor, $batched, $limits, static function () use ($root, $patterns, $exclude_patterns, $allowed_roots): array {
            $roots = [];
            foreach ($patterns as $pattern) {
                $prefix = substr($pattern, 0, strcspn($pattern, '*?[{'));
                $separator = strrpos($prefix, '/');
                $directory = $separator === false ? $root : $root . '/' . substr($prefix, 0, $separator);
                if (is_dir($directory)) {
                    $roots[$directory] = $directory;
                }
            }

            sort($roots, SORT_STRING);
            $narrowed_roots = [];
            foreach ($roots as $directory) {
                foreach ($narrowed_roots as $parent) {
                    if (self::within($directory, $parent)) {
                        continue 2;
                    }
                }
                $narrowed_roots[] = $directory;
            }

            return [
                'kind' => 'local',
                'root' => $root,
                'roots' => array_reverse($narrowed_roots),
                'allowed_roots' => $allowed_roots,
                'patterns' => array_map([self::class, 'pattern_regex'], $patterns),
                'exclude_patterns' => array_map([self::class, 'pattern_regex'], $exclude_patterns),
                'stack' => [],
                'seen_directories' => [],
                'seen_files' => [],
                'done' => false,
            ];
        });
    }

    public static function local_scope(string $root, array $patterns, array $exclude_patterns = []): string
    {
        return self::configuration_scope(self::local_configuration($root, $patterns, $exclude_patterns));
    }

    /**
     * Snapshot provider-selected paths once, preserving Finder extension hooks.
     * The factory returns records with a path and any source metadata to retain.
     */
    public static function scan_files(string $scope, callable $factory, $cursor = false, array $limits = []): array
    {
        return self::scan('provider:' . $scope, $cursor, true, $limits, static function () use ($factory): array {
            $files = [];
            foreach ($factory() as $file) {
                if (! is_array($file) || ! isset($file['path']) || ! is_string($file['path'])) {
                    throw new \InvalidArgumentException(__('A scanner returned an invalid file path.', 'windpress'));
                }
                $real_path = realpath($file['path']);
                if ($real_path === false || ! is_file($real_path)) {
                    throw new \RuntimeException(__('A source file no longer exists: ', 'windpress') . $file['path']);
                }
                $file['path'] = $real_path;
                $file['name'] = $file['name'] ?? basename($real_path);
                if (! isset($files[$real_path])) {
                    $files[$real_path] = $file;
                }
            }
            ksort($files, SORT_STRING);

            return [
                'kind' => 'files',
                'files' => array_values($files),
                'offset' => 0,
                'done' => false,
            ];
        });
    }

    private static function local_configuration(string $root, array $patterns, array $exclude_patterns): array
    {
        $root = realpath($root);
        if ($root === false || ! is_dir($root)) {
            throw new \InvalidArgumentException(__('The source directory does not exist.', 'windpress'));
        }

        $patterns = self::normalize_patterns($patterns, $root);
        $exclude_patterns = self::normalize_patterns($exclude_patterns, $root);
        $allowed_roots = apply_filters('f!windpress/core/scanner/file:allowed_roots', [$root], $root);
        if (! is_array($allowed_roots)) {
            throw new \InvalidArgumentException(__('Allowed source directories must be an array.', 'windpress'));
        }
        foreach ($allowed_roots as $allowed_root) {
            if (! is_string($allowed_root)) {
                throw new \InvalidArgumentException(__('Allowed source directories must contain paths.', 'windpress'));
            }
        }
        $allowed_roots = array_values(array_unique(array_filter(array_map('realpath', $allowed_roots))));
        sort($allowed_roots, SORT_STRING);

        return [$root, $patterns, $exclude_patterns, $allowed_roots];
    }

    private static function configuration_scope(array $configuration): string
    {
        return hash('sha256', serialize(['files-v1', $configuration]));
    }

    private static function scan(string $scope, $cursor, bool $batched, array $limits, callable $factory): array
    {
        $limits = array_replace([
            'files' => 100,
            'bytes' => 2 * 1024 * 1024,
            'seconds' => 1.0,
        ], $limits);
        $limits = apply_filters('f!windpress/core/scanner/file:limits', $limits, $scope);
        if (! is_array($limits) || ! isset($limits['files'], $limits['bytes'], $limits['seconds']) || ! is_int($limits['files']) || ! is_int($limits['bytes']) || ! is_numeric($limits['seconds']) || ! is_finite((float) $limits['seconds']) || $limits['files'] < 1 || $limits['bytes'] < 1 || $limits['bytes'] === PHP_INT_MAX || $limits['seconds'] <= 0) {
            throw new \InvalidArgumentException(__('File scan limits must be positive.', 'windpress'));
        }

        $page = 0;
        $key = '';
        if ($cursor !== false && $cursor !== null) {
            if (! $batched || ! is_string($cursor) || ! preg_match('/^fs_([a-f0-9]{32})_([0-9]+)$/D', $cursor, $matches)) {
                throw new \InvalidArgumentException(__('The file scan cursor is invalid.', 'windpress'));
            }
            $key = 'windpress_scan_' . get_current_user_id() . '_' . $matches[1];
            $page = (int) $matches[2];
        } elseif ($batched) {
            $key = 'windpress_scan_' . get_current_user_id() . '_' . bin2hex(random_bytes(16));
        }

        $lease = $batched ? ScanLock::acquire($key) : null;
        if ($batched && $lease === null) {
            throw new \RuntimeException(__('This file scan is already processing a batch. Retry the same cursor.', 'windpress'), 409);
        }
        try {
            return self::scan_page($scope, $cursor, $batched, $limits, $factory, $key, $page, $lease);
        } finally {
            if ($lease !== null) {
                ScanLock::release($key, $lease);
            }
        }
    }

    private static function scan_page(string $scope, $cursor, bool $batched, array $limits, callable $factory, string $key, int $page, ?string $lease): array
    {
        if ($cursor !== false && $cursor !== null) {
            $job = get_transient($key);
            if (! is_array($job) || $job['scope'] !== $scope) {
                throw new \InvalidArgumentException(__('The file scan expired or its sources changed. Start a new scan.', 'windpress'));
            }
            if ($page === $job['previous_page']) {
                return $job['previous_response'];
            }
            if ($page !== $job['page']) {
                throw new \InvalidArgumentException(__('The file scan cursor is out of sequence. Start a new scan.', 'windpress'));
            }
            $state = $job['state'];
        } else {
            $state = $factory();
        }

        $contents = [];
        $bytes = 0;
        $deadline = $batched ? microtime(true) + $limits['seconds'] : PHP_FLOAT_MAX;
        while (! $state['done'] && (! $batched || (count($contents) < $limits['files'] && microtime(true) < $deadline))) {
            if (! isset($state['pending'])) {
                $state['pending'] = self::next_file($state, $deadline);
            }
            if ($state['pending'] === null) {
                unset($state['pending']);
                break;
            }

            $file = $state['pending'];
            $path = $file['path'];
            if ($state['kind'] === 'local') {
                $path = self::allowed_path($state, $path);
            }
            clearstatcache(true, $path);
            if (! is_file($path) || ! is_readable($path)) {
                throw new \RuntimeException(__('A source file cannot be read: ', 'windpress') . $file['name']);
            }
            $size = @filesize($path);
            if ($size === false) {
                throw new \RuntimeException(__('The source file size could not be read: ', 'windpress') . $file['name']);
            }
            if ($batched && $size > $limits['bytes']) {
                throw new \RuntimeException(__('A source file exceeds the scan byte limit: ', 'windpress') . $file['name']);
            }
            if ($batched && $bytes + $size > $limits['bytes']) {
                break;
            }

            $content = $batched ? @file_get_contents($path, false, null, 0, $limits['bytes'] + 1) : @file_get_contents($path);
            if ($content === false) {
                throw new \RuntimeException(__('A source file could not be read: ', 'windpress') . $file['name']);
            }
            if ($batched && strlen($content) > $limits['bytes']) {
                throw new \RuntimeException(__('A source file exceeds the scan byte limit: ', 'windpress') . $file['name']);
            }
            if ($batched && $bytes + strlen($content) > $limits['bytes']) {
                break;
            }
            $bytes += strlen($content);
            unset($file['path'], $state['pending']);
            $file['source_id'] = 'file:' . hash('sha256', $path);
            $file['content'] = $content;
            $contents[] = $file;
        }

        $next_batch = false;
        if ($batched && ! $state['done']) {
            $next_batch = 'fs_' . substr($key, -32) . '_' . ($page + 1);
        }
        $response = [
            'contents' => $contents,
            'metadata' => [
                'next_batch' => $next_batch,
                'scanned_files' => count($contents),
                'scanned_bytes' => $bytes,
            ],
        ];
        if ($batched && ($next_batch !== false || $cursor !== false && $cursor !== null)) {
            if ($lease === null || ! ScanLock::is_owner($key, $lease)) {
                throw new \RuntimeException(__('The file scan lease expired. Retry the same cursor.', 'windpress'), 409);
            }
            $job = [
                'scope' => $scope,
                'page' => $page + 1,
                'state' => $state['done'] ? [] : $state,
                'previous_page' => $page,
                'previous_response' => $response,
            ];
            if (! set_transient($key, $job, self::CURSOR_TTL)) {
                throw new \RuntimeException(__('The file scan continuation could not be saved.', 'windpress'));
            }
        }

        return $response;
    }

    private static function next_file(array &$state, float $deadline): ?array
    {
        if ($state['kind'] === 'files') {
            if ($state['offset'] >= count($state['files'])) {
                $state['done'] = true;
                return null;
            }
            return $state['files'][$state['offset']++];
        }

        while (microtime(true) < $deadline) {
            if ($state['stack'] === []) {
                if ($state['roots'] === []) {
                    $state['done'] = true;
                    return null;
                }
                self::open_directory($state, array_pop($state['roots']));
                continue;
            }
            $index = count($state['stack']) - 1;
            $frame = &$state['stack'][$index];
            if ($frame['offset'] >= count($frame['entries'])) {
                unset($frame);
                array_pop($state['stack']);
                continue;
            }
            $name = $frame['entries'][$frame['offset']++];
            $path = $frame['path'] . '/' . $name;
            unset($frame);
            // Preserve Finder's default hidden-file and VCS-directory exclusions.
            if ($name[0] === '.' || in_array($name, ['CVS', '_darcs', '_svn'], true)) {
                continue;
            }
            $relative_path = substr($path, strlen($state['root']) + 1);
            if (self::matches($relative_path, $state['exclude_patterns']) || (is_dir($path) && self::matches($relative_path . '/', $state['exclude_patterns']))) {
                continue;
            }
            if (is_dir($path)) {
                self::open_directory($state, $path);
                continue;
            }
            if (! self::matches($relative_path, $state['patterns'])) {
                continue;
            }
            $real_path = self::allowed_path($state, $path);
            if (isset($state['seen_files'][$real_path])) {
                continue;
            }
            $state['seen_files'][$real_path] = true;

            return [
                'path' => $real_path,
                'name' => $name,
                'relative_path' => $relative_path,
            ];
        }

        return null;
    }

    private static function open_directory(array &$state, string $path): void
    {
        $relative_path = substr($path, strlen($state['root']) + 1);
        if (self::matches($relative_path, $state['exclude_patterns']) || self::matches($relative_path . '/', $state['exclude_patterns'])) {
            return;
        }
        $real_path = self::allowed_path($state, $path);
        if (isset($state['seen_directories'][$path])) {
            return;
        }
        foreach ($state['stack'] as $frame) {
            if ($frame['real_path'] === $real_path) {
                return;
            }
        }
        $entries = @scandir($path);
        if ($entries === false) {
            throw new \RuntimeException(__('A source directory could not be read: ', 'windpress') . $relative_path);
        }
        $state['seen_directories'][$path] = true;
        $state['stack'][] = [
            'path' => $path,
            'real_path' => $real_path,
            'entries' => $entries,
            'offset' => 0,
        ];
    }

    private static function allowed_path(array $state, string $path): string
    {
        $real_path = realpath($path);
        if ($real_path === false) {
            throw new \RuntimeException(__('A source path no longer exists: ', 'windpress') . substr($path, strlen($state['root']) + 1));
        }
        foreach ($state['allowed_roots'] as $root) {
            if (self::within($real_path, $root)) {
                return $real_path;
            }
        }
        throw new \RuntimeException(__('A source symlink points outside the allowed directories: ', 'windpress') . substr($path, strlen($state['root']) + 1));
    }

    private static function within(string $path, string $root): bool
    {
        return $path === $root || strpos($path, rtrim($root, '/') . '/') === 0;
    }

    private static function normalize_patterns(array $patterns, string $root): array
    {
        $normalized = [];
        foreach ($patterns as $pattern) {
            if (! is_string($pattern) || $pattern === '' || strlen($pattern) > 4096 || strpos($pattern, "\0") !== false) {
                throw new \InvalidArgumentException(__('Source patterns must be nonempty strings up to 4096 bytes.', 'windpress'));
            }
            $pattern = str_replace('\\', '/', $pattern);
            if ($pattern[0] === '/' || preg_match('#(^|/)\.\.(/|$)|^[a-zA-Z]+:#', $pattern)) {
                throw new \InvalidArgumentException(__('Source patterns must stay within the source directory.', 'windpress'));
            }
            while (strpos($pattern, './') === 0) {
                $pattern = substr($pattern, 2);
            }
            $pattern = rtrim($pattern, '/');
            if ($pattern === '') {
                throw new \InvalidArgumentException(__('Source patterns must not be empty.', 'windpress'));
            }
            if (is_dir($root . '/' . $pattern)) {
                $pattern .= '/**';
            }
            self::pattern_regex($pattern);
            $normalized[$pattern] = $pattern;
        }
        sort($normalized, SORT_STRING);
        return $normalized;
    }

    private static function pattern_regex(string $pattern): string
    {
        // Symfony recognizes recursive ** after a slash, including at pattern start here.
        $regex = Glob::toRegex('windpress/' . $pattern);
        if (@preg_match($regex, '') === false) {
            throw new \InvalidArgumentException(__('A source pattern is invalid.', 'windpress'));
        }
        return $regex;
    }

    private static function matches(string $path, array $patterns): bool
    {
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, 'windpress/' . $path) === 1) {
                return true;
            }
        }
        return false;
    }
}
