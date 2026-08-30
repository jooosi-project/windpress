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
namespace WindPress\WindPress\Utils;

use ArrayAccess;
use Exception;
use WindPressDeps\Symfony\Component\PropertyAccess\Exception\AccessException;
use WindPressDeps\Symfony\Component\PropertyAccess\Exception\InvalidArgumentException;
use WindPressDeps\Symfony\Component\PropertyAccess\Exception\UnexpectedTypeException;
use WindPressDeps\Symfony\Component\PropertyAccess\PropertyAccess;
use WIND_PRESS;
/**
 * Accessor for the plugin config.
 *
 * @since 3.0.0
 */
class Config
{
    /**
     * Stores the instance of PropertyAccessor, implementing a Singleton pattern.
     */
    private static ?\WindPressDeps\Symfony\Component\PropertyAccess\PropertyAccessorInterface $propertyAccessor = null;
    public static function propertyAccessor()
    {
        if (!isset(self::$propertyAccessor)) {
            self::$propertyAccessor = PropertyAccess::createPropertyAccessorBuilder()->enableExceptionOnInvalidIndex()->getPropertyAccessor();
        }
        return self::$propertyAccessor;
    }
    /**
     * Gets a value at the end of the property path of the config.
     *
     * @param string $path The property path to read
     * @param mixed $defaultValue The value to return if the property path does not exist
     *
     * @return mixed The value at the end of the property path
     */
    public static function get($path, $defaultValue = null)
    {
        $options = json_decode(get_option(WIND_PRESS::WP_OPTION . '_options', '{}'), null, 512, \JSON_THROW_ON_ERROR);
        $options = apply_filters('f!windpress/utlis/config:options', $options);
        try {
            return self::propertyAccessor()->getValue($options, $path);
        } catch (Exception $exception) {
            return $defaultValue;
        }
    }
    /**
     * Sets a value at the end of the property path of the config.
     *
     * @param string $path The property path to modify
     * @param mixed $value The value to set at the end of the property path
     *
     * @throws InvalidArgumentException If the property path is invalid
     * @throws AccessException          If a property/index does not exist or is not public
     * @throws UnexpectedTypeException  If a value within the path is neither object nor array
     */
    public static function set($path, $value)
    {
        $options = json_decode(get_option(WIND_PRESS::WP_OPTION . '_options', '{}'), null, 512, \JSON_THROW_ON_ERROR);
        $options = apply_filters('f!windpress/utlis/config:options', $options);
        if (self::propertyAccessor()->isWritable($options, $path)) {
            self::propertyAccessor()->setValue($options, $path, $value);
        } else {
            self::data_set($options, $path, $value);
        }
        update_option(WIND_PRESS::WP_OPTION . '_options', wp_json_encode($options, \JSON_THROW_ON_ERROR));
    }
    /**
     * Set an item on an array or object using dot notation.
     *
     * @param  mixed  $target
     * @param  string|array  $key
     * @param  mixed  $value
     * @param  bool  $overwrite
     * @return mixed
     *
     * @see https://github.com/laravel/framework/blob/a84c4f41d3fb1c57684bb417b1f0858300e769d0/src/Illuminate/Collections/helpers.php#L109
     */
    public static function data_set(&$target, $key, $value, $overwrite = \true)
    {
        $segments = is_array($key) ? $key : explode('.', $key);
        if (($segment = array_shift($segments)) === '*') {
            if (!self::array_accessible($target)) {
                $target = [];
            }
            if ($segments) {
                foreach ($target as &$inner) {
                    self::data_set($inner, $segments, $value, $overwrite);
                }
            } elseif ($overwrite) {
                foreach ($target as &$inner) {
                    $inner = $value;
                }
            }
        } elseif (self::array_accessible($target)) {
            if ($segments) {
                if (!self::array_exists($target, $segment)) {
                    $target[$segment] = [];
                }
                self::data_set($target[$segment], $segments, $value, $overwrite);
            } elseif ($overwrite || !self::array_exists($target, $segment)) {
                $target[$segment] = $value;
            }
        } elseif (is_object($target)) {
            if ($segments) {
                if (!isset($target->{$segment})) {
                    $target->{$segment} = [];
                }
                self::data_set($target->{$segment}, $segments, $value, $overwrite);
            } elseif ($overwrite || !isset($target->{$segment})) {
                $target->{$segment} = $value;
            }
        } else {
            $target = [];
            if ($segments) {
                self::data_set($target[$segment], $segments, $value, $overwrite);
            } elseif ($overwrite) {
                $target[$segment] = $value;
            }
        }
        return $target;
    }
    /**
     * Determine if the given key exists in the provided array.
     *
     * @param  \ArrayAccess|array  $array
     * @param  string|int  $key
     * @return bool
     *
     * @see https://github.com/laravel/framework/blob/a84c4f41d3fb1c57684bb417b1f0858300e769d0/src/Illuminate/Collections/Arr.php#L164
     */
    public static function array_exists($array, $key)
    {
        if ($array instanceof ArrayAccess) {
            return $array->offsetExists($key);
        }
        if (is_float($key)) {
            $key = (string) $key;
        }
        return array_key_exists($key, $array);
    }
    /**
     * Determine whether the given value is array accessible.
     *
     * @param  mixed  $value
     * @return bool
     *
     * @see https://github.com/laravel/framework/blob/a84c4f41d3fb1c57684bb417b1f0858300e769d0/src/Illuminate/Collections/Arr.php#L21
     */
    public static function array_accessible($value)
    {
        return is_array($value) || $value instanceof ArrayAccess;
    }
}
