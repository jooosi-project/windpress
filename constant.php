<?php

/*
 * This file is part of the WindPress package.
 *
 * (c) Joshua Gugun Siagian <suabahasa@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

/**
 * Plugin constants.
 *
 * @since 3.0.0
 */
class WIND_PRESS
{
    /**
     * @var string
     */
    public const FILE = __DIR__ . '/windpress.php';

    /**
     * @var string
     */
    public const VERSION = '3.3.88';

    /**
     * @var string
     */
    public const WP_OPTION = 'windpress';

    /**
     * @var string
     */
    public const DB_TABLE_PREFIX = 'windpress';

    /**
     * The text domain should use the literal string 'windpress' as the text domain.
     * This constant is used for reference only and should not be used as the actual text domain.
     *
     * @var string
     */
    public const TEXT_DOMAIN = 'windpress';

    /**
     * @var array
     */
    public const EDD_STORE = [
        'store_url' => 'https://jooo.si',
        'item_id' => 2250, // WindPress or Yabe Siul
    ];

    /**
     * @var string
     */
    public const REST_NAMESPACE = 'windpress/v1';

    public const DATA_DIR = '/windpress/data/';

    public const CACHE_DIR = '/windpress/cache/';
}
