<?php

declare (strict_types=1);
namespace WindPress\WindPress\Core\Scanner;

use InvalidArgumentException;
use RuntimeException;
use WIND_PRESS;
/**
 * Immutable source manifests and resumable, deletion-aware deltas.
 */
class SourceIndex
{
    private const JOB_TTL = 900;
    private const MANIFEST_TTL = 7 * 86400;
    private const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
    private const MAX_MANIFESTS = 8;
    public static function scan(string $scope, array $metadata, callable $fetch): array
    {
        $request = $metadata['source_index'] ?? null;
        if (!is_array($request) || ($request['version'] ?? null) !== 1 || !array_key_exists('baseline', $request) || $request['baseline'] !== null && (!is_string($request['baseline']) || !preg_match('/^[a-f0-9]{64}$/D', $request['baseline'])) || !in_array($metadata['kind'] ?? 'incremental', ['full', 'incremental'], \true)) {
            throw new InvalidArgumentException(__('The source index request is invalid.', 'windpress'));
        }
        $scope = hash('sha256', serialize([1, WIND_PRESS::VERSION, get_current_blog_id(), get_current_user_id(), get_locale(), $scope, apply_filters('f!windpress/core/scanner/source_index:scope', '', $scope)]));
        $cursor = $metadata['next_batch'] ?? \false;
        $context = $metadata;
        unset($context['next_batch']);
        ksort($context);
        $context = hash('sha256', serialize($context));
        $page = 0;
        $token = bin2hex(random_bytes(16));
        if ($cursor !== \false && $cursor !== null) {
            if (!is_string($cursor) || !preg_match('/^idx_([a-f0-9]{32})_([0-9]+)$/D', $cursor, $matches)) {
                throw new InvalidArgumentException(__('The source index cursor is invalid.', 'windpress'));
            }
            $token = $matches[1];
            $page = (int) $matches[2];
        }
        $key = 'windpress_source_job_' . $token;
        $lease = \WindPress\WindPress\Core\Scanner\ScanLock::acquire($key);
        if ($lease === null) {
            throw new RuntimeException(__('This source scan is already processing. Retry the same cursor.', 'windpress'), 409);
        }
        try {
            if ($cursor === \false || $cursor === null) {
                $baseline = ($metadata['kind'] ?? 'incremental') === 'full' ? null : $request['baseline'];
                $manifest = $baseline === null ? \false : get_transient(self::manifest_key($scope, $baseline));
                if (!is_array($manifest) || ($manifest['scope'] ?? null) !== $scope || !is_array($manifest['sources'] ?? null)) {
                    $baseline = null;
                    $manifest = ['sources' => []];
                }
                $state = ['scope' => $scope, 'context' => $context, 'page' => 0, 'cursor' => \false, 'baseline' => $baseline, 'previous' => $manifest['sources'], 'current' => [], 'cursors' => []];
            } else {
                $state = get_transient($key);
                if (!is_array($state) || ($state['scope'] ?? null) !== $scope || ($state['context'] ?? null) !== $context) {
                    throw new RuntimeException(__('The source scan expired or its context changed. Restart the build.', 'windpress'), 409);
                }
                if (($state['last_page'] ?? null) === $page) {
                    return $state['last_response'];
                }
                if (($state['page'] ?? null) !== $page || ($state['cursor'] ?? \false) === \false) {
                    throw new RuntimeException(__('The source cursor is out of sequence. Restart the build.', 'windpress'), 409);
                }
            }
            $provider_metadata = $metadata;
            $provider_metadata['next_batch'] = $state['cursor'];
            unset($provider_metadata['source_index']);
            $result = $fetch($provider_metadata);
            if (!is_array($result) || !is_array($result['contents'] ?? null) || !is_array($result['metadata'] ?? null)) {
                throw new RuntimeException(__('The indexed provider returned an invalid response.', 'windpress'));
            }
            $contents = [];
            $examined = 0;
            foreach ($result['contents'] as $source) {
                if (!is_array($source) || !is_string($source['source_id'] ?? null) || $source['source_id'] === '' || strlen($source['source_id']) > 2048 || !is_string($source['content'] ?? null) || isset($source['type']) && !is_string($source['type'])) {
                    throw new RuntimeException(__('An indexed source requires a stable ID and text content.', 'windpress'));
                }
                $id = $source['source_id'];
                if (isset($state['current'][$id])) {
                    throw new RuntimeException(__('The provider returned a duplicate source ID: ', 'windpress') . $id);
                }
                $hash = hash('sha256', serialize([$source['content'], $source['type'] ?? null]));
                $state['current'][$id] = $hash;
                $examined++;
                if (($state['previous'][$id] ?? null) !== $hash) {
                    $source['source_hash'] = $hash;
                    $contents[] = $source;
                }
            }
            $next = $result['metadata']['next_batch'] ?? \false;
            if ($next !== \false && (!is_string($next) || $next === '') && (!is_int($next) || $next < 1)) {
                throw new RuntimeException(__('The indexed provider returned an invalid cursor.', 'windpress'));
            }
            if ($next !== \false) {
                $cursor_key = hash('sha256', serialize($next));
                if (isset($state['cursors'][$cursor_key])) {
                    throw new RuntimeException(__('The indexed provider repeated a cursor.', 'windpress'));
                }
                $state['cursors'][$cursor_key] = \true;
            }
            $revision = null;
            $deleted = [];
            if ($next === \false) {
                ksort($state['current'], \SORT_STRING);
                $revision = hash('sha256', serialize([$scope, $state['current']]));
                $deleted = array_map('strval', array_keys(array_diff_key($state['previous'], $state['current'])));
            }
            $result['contents'] = $contents;
            $result['metadata']['next_batch'] = $next === \false ? \false : 'idx_' . $token . '_' . ($page + 1);
            $result['metadata']['source_index'] = ['version' => 1, 'mode' => $state['baseline'] === null ? 'snapshot' : 'delta', 'scope' => $scope, 'base_revision' => $state['baseline'], 'revision' => $revision, 'deleted' => $deleted, 'examined' => $examined, 'changed' => count($contents), 'unchanged' => $examined - count($contents)];
            if (!\WindPress\WindPress\Core\Scanner\ScanLock::is_owner($key, $lease)) {
                throw new RuntimeException(__('The source scan lease expired. Restart the build.', 'windpress'), 409);
            }
            if ($revision !== null) {
                self::save_manifest($scope, $revision, $state['current']);
                unset($state['previous'], $state['current'], $state['cursors']);
            }
            $state['cursor'] = $next;
            $state['page'] = $page + 1;
            $state['last_page'] = $page;
            $state['last_response'] = $result;
            // A single-page scan has no continuation to replay.
            if ($next !== \false || $page > 0) {
                self::persist($key, $state, self::JOB_TTL);
            }
            return $result;
        } finally {
            \WindPress\WindPress\Core\Scanner\ScanLock::release($key, $lease);
        }
    }
    private static function manifest_key(string $scope, string $revision): string
    {
        return 'windpress_source_manifest_' . hash('sha256', $scope . $revision);
    }
    private static function save_manifest(string $scope, string $revision, array $sources): void
    {
        $manifest = ['scope' => $scope, 'sources' => $sources];
        // Oversized sites can still build; their next request falls back to a snapshot.
        if (strlen(serialize($manifest)) > self::MAX_MANIFEST_BYTES) {
            return;
        }
        $registry_key = 'windpress_source_history_' . $scope;
        $lease = \WindPress\WindPress\Core\Scanner\ScanLock::acquire($registry_key);
        if ($lease === null) {
            throw new RuntimeException(__('Another scan is saving its source manifest. Retry the same cursor.', 'windpress'), 409);
        }
        try {
            $history = get_transient($registry_key);
            $history = is_array($history) ? $history : [];
            unset($history[$revision]);
            $history[$revision] = \true;
            $expired = [];
            while (count($history) > self::MAX_MANIFESTS) {
                $expired[] = array_key_first($history);
                array_shift($history);
            }
            self::persist(self::manifest_key($scope, $revision), $manifest, self::MANIFEST_TTL);
            self::persist($registry_key, $history, self::MANIFEST_TTL);
            foreach ($expired as $old_revision) {
                delete_transient(self::manifest_key($scope, $old_revision));
            }
        } finally {
            \WindPress\WindPress\Core\Scanner\ScanLock::release($registry_key, $lease);
        }
    }
    private static function persist(string $key, array $value, int $ttl): void
    {
        if (!set_transient($key, $value, $ttl) && get_transient($key) !== $value) {
            throw new RuntimeException(__('Unable to save the source index. Restart the build.', 'windpress'));
        }
    }
}
