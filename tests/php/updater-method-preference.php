<?php

declare(strict_types=1);

namespace WindPress\WindPress {
    final class Plugin
    {
        public static function is_pro_edition(): bool
        {
            return false;
        }
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

    check(Common::is_updater_library_available() === false, 'The Plugin edition check was not preferred when available.');

    echo "Updater method preference check passed.\n";
}
