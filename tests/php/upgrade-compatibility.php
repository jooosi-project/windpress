<?php

declare(strict_types=1);

namespace WindPress\WindPress {
    // Simulate a pre-3.3.87 Plugin class already loaded during an upgrade.
    final class Plugin
    {
    }
}

namespace {
    use WindPress\WindPress\Utils\Common;

    require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

    function check(bool $condition, string $message): void
    {
        if (! $condition) {
            throw new RuntimeException($message);
        }
    }

    check(! method_exists(\WindPress\WindPress\Plugin::class, 'is_pro_edition'), 'The legacy Plugin fixture unexpectedly has the new method.');

    $plugin_directory = dirname(\WIND_PRESS::FILE);
    $new_sdk_path = $plugin_directory . '/vendor/easy-digital-downloads/edd-sl-sdk/edd-sl-sdk.php';
    $legacy_sdk_path = $plugin_directory . '/vendor/rosua/edd-sl-plugin-updater/src/PluginUpdater.php';
    $expected = is_file($new_sdk_path) || is_file($legacy_sdk_path);
    check(Common::is_updater_library_available() === $expected, 'Updater detection depends on the currently loaded Plugin class.');

    echo "Upgrade compatibility check passed.\n";
}
