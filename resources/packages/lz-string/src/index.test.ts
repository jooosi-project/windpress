import { describe, expect, it } from 'vitest';

import {
  compressToUTF16,
  compressToUint8Array,
  decompressFromUTF16,
  decompressFromUint8Array,
} from './index';

interface Fixture {
  input: string;
  compressedCodeUnits: number[];
}

const fixtures: Fixture[] = [
  {
    input: '',
    compressedCodeUnits: [8224, 32],
  },
  {
    input: 'hello world',
    compressedCodeUnits: [738, 19501, 19518, 24612, 1940, 16572, 24617, 18464, 32],
  },
  {
    input: '😀 Tailwind 世界',
    compressedCodeUnits: [
      22435, 14368, 31520, 16458, 1104, 9632, 27694, 29088, 30241, 6576, 13401, 8325, 11872,
      32,
    ],
  },
  {
    input: '{"contents":["flex","p-4"],"timestamp":1720000000000}',
    compressedCodeUnits: [
      7137, 2129, 16908, 1920, 5925, 6880, 26416, 1504, 13992, 848, 1774, 152, 16422, 16928,
      1825, 13344, 22624, 3020, 9761, 5666, 27908, 8992, 17254, 9920, 4512, 15136, 9760, 1665,
      4546, 412, 16416, 32,
    ],
  },
  {
    input: 'a'.repeat(512),
    compressedCodeUnits: [4326, 24377, 11965, 24547, 2706, 11643, 26886, 24303, 15390, 1588, 18464, 32],
  },
];

function fromCodeUnits(codeUnits: number[]): string {
  return String.fromCharCode(...codeUnits);
}

function toCodeUnits(value: string): number[] {
  return Array.from(value, (character) => character.charCodeAt(0));
}

describe('WindPress lz-string compatibility', () => {
  it.each(fixtures)('preserves the existing UTF-16 encoding for %#', ({ input, compressedCodeUnits }) => {
    expect(toCodeUnits(compressToUTF16(input))).toEqual(compressedCodeUnits);
  });

  it.each(fixtures)('decodes existing WindPress UTF-16 values for %#', ({ input, compressedCodeUnits }) => {
    expect(decompressFromUTF16(fromCodeUnits(compressedCodeUnits))).toBe(input);
  });

  it.each([
    { input: '', bytes: [64, 0] },
    {
      input: 'hello world',
      bytes: [5, 133, 48, 54, 96, 246, 0, 64, 238, 144, 39, 48, 4, 200, 0, 0],
    },
    {
      input: '😀 Tailwind 世界',
      bytes: [175, 6, 224, 3, 216, 4, 2, 160, 134, 9, 96, 54, 7, 113, 128, 236, 2, 102, 65, 161, 202, 6, 85, 200, 0, 0],
    },
  ])('preserves legacy Uint8Array exports for %#', ({ input, bytes }) => {
    const compressed = compressToUint8Array(input);
    expect(Array.from(compressed)).toEqual(bytes);
    expect(decompressFromUint8Array(compressed)).toBe(input);
  });
});
