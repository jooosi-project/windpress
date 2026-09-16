<?php

declare(strict_types=1);

foreach (glob(__DIR__ . '/*.php') as $test) {
    if ($test === __FILE__) {
        continue;
    }

    passthru(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($test), $status);
    if ($status !== 0) {
        exit($status);
    }
}
