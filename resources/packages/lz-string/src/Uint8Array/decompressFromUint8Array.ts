/*
 * SPDX-FileCopyrightText: 2013 Pieroxy <pieroxy@pieroxy.net>
 *
 * SPDX-License-Identifier: MIT
 */

import { _decompress } from '../_decompress';

export function decompressFromUint8Array(compressed: Uint8Array | null): string | null {
  if (compressed === null) {
    return '';
  }

  if (compressed.length === 0) {
    return null;
  }

  const values: string[] = [];

  for (let index = 0; index < compressed.length; index += 2) {
    values.push(String.fromCharCode(compressed[index] * 256 + (compressed[index + 1] || 0)));
  }

  const value = values.join('');
  return _decompress(value.length, 32768, (index) => value.charCodeAt(index)) ?? null;
}
