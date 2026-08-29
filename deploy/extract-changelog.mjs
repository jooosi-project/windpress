#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const changelogPath = fileURLToPath(new URL('../CHANGELOG.md', import.meta.url));

export function extractChangelogForVersion(version) {
  const lines = readFileSync(changelogPath, 'utf8').split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));

  if (start === -1) {
    throw new Error(`Version ${version} was not found in CHANGELOG.md.`);
  }

  const next = lines.findIndex((line, index) => index > start && /^## \[[^\]]+\]/.test(line));

  return lines
    .slice(start + 1, next === -1 ? lines.length : next)
    .filter((line) => !/^\[[^\]]+\]: https?:\/\//.test(line))
    .join('\n')
    .trim();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = process.argv[2];

  if (! version) {
    throw new Error('Usage: node deploy/extract-changelog.mjs <version>');
  }

  process.stdout.write(`${extractChangelogForVersion(version)}\n`);
}
