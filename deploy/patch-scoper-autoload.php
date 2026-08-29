<?php

declare(strict_types=1);

$scoperAutoloadPath = $argv[1] ?? null;

if ($scoperAutoloadPath === null || ! is_file($scoperAutoloadPath)) {
    fwrite(STDERR, "Usage: php deploy/patch-scoper-autoload.php <path-to-scoper-autoload.php>\n");
    exit(1);
}

$contents = file_get_contents($scoperAutoloadPath);

if ($contents === false) {
    fwrite(STDERR, "Unable to read {$scoperAutoloadPath}.\n");
    exit(1);
}

$loadScopedRegistry = <<<'PHP'
    $GLOBALS['__composer_autoload_files'] = $GLOBALS['__composer_autoload_files_windpress_deps'] ?? [];
PHP;

$saveScopedRegistry = <<<'PHP'
    $GLOBALS['__composer_autoload_files_windpress_deps'] = $GLOBALS['__composer_autoload_files'];
PHP;

$hasLoadPatch = str_contains($contents, $loadScopedRegistry);
$hasSavePatch = str_contains($contents, $saveScopedRegistry);

if ($hasLoadPatch || $hasSavePatch) {
    if ($hasLoadPatch && $hasSavePatch) {
        exit(0);
    }

    fwrite(STDERR, "The scoped Composer registry patch is incomplete.\n");
    exit(1);
}

$loadMarker = <<<'PHP'
    $loader = require_once __DIR__.'/autoload.php';
PHP;

$restoreMarker = <<<'PHP'
    // Restore the backup and ensure the excluded files are properly marked as loaded
PHP;

$contents = str_replace(
    $loadMarker,
    $loadScopedRegistry . "\n\n" . $loadMarker,
    $contents,
    $loadMarkerCount,
);

$contents = str_replace(
    $restoreMarker,
    $saveScopedRegistry . "\n\n" . $restoreMarker,
    $contents,
    $restoreMarkerCount,
);

if ($loadMarkerCount !== 1 || $restoreMarkerCount !== 1) {
    fwrite(STDERR, "Unable to locate the expected PHP-Scoper autoloader markers.\n");
    exit(1);
}

if (file_put_contents($scoperAutoloadPath, $contents) === false) {
    fwrite(STDERR, "Unable to update {$scoperAutoloadPath}.\n");
    exit(1);
}
