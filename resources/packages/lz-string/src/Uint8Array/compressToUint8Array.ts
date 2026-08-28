/*
 * SPDX-FileCopyrightText: 2013 Pieroxy <pieroxy@pieroxy.net>
 *
 * SPDX-License-Identifier: MIT
 */

import { _compress } from '../_compress';

export function compressToUint8Array(input: string | null): Uint8Array {
  const compressed = input === null ? '' : _compress(input, 16, (value) => String.fromCharCode(value));
  const buffer = new Uint8Array(compressed.length * 2);

  for (let index = 0; index < compressed.length; index += 1) {
    const value = compressed.charCodeAt(index);
    buffer[index * 2] = value >>> 8;
    buffer[index * 2 + 1] = value % 256;
  }

  return buffer;
}
