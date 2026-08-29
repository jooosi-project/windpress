#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const changelogPath = fileURLToPath(new URL('../CHANGELOG.md', import.meta.url));
const readmePath = fileURLToPath(new URL('../readme.txt', import.meta.url));

function parseEntries(content) {
  const entries = [];
  let current = null;

  for (const line of content.split('\n')) {
    const match = line.match(/^## \[([^\]]+)] - (.+)$/);

    if (match) {
      if (current) entries.push(current);
      current = { version: match[1], date: match[2], lines: [] };
      continue;
    }

    if (line.startsWith('## ')) {
      if (current) entries.push(current);
      current = null;
      continue;
    }

    if (! current || /^\[[^\]]+]: https?:\/\//.test(line)) continue;
    if (line.startsWith('### ')) current.lines.push('', `**${line.slice(4).trim()}**`, '');
    else if (line.startsWith('- ')) current.lines.push(`* ${line.slice(2).trim()}`);
    else if (line.trim()) current.lines.push(line);
  }

  if (current) entries.push(current);

  return entries;
}

function formatEntries(entries) {
  return entries.map((entry) => {
    const content = entry.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    return `= ${entry.version} - ${entry.date} =\n\n${content}`.trim();
  }).join('\n\n');
}

const readme = readFileSync(readmePath, 'utf8');
const marker = '== Changelog ==';
const markerIndex = readme.indexOf(marker);

if (markerIndex === -1) {
  throw new Error('Could not find the "== Changelog ==" section in readme.txt.');
}

const entries = formatEntries(parseEntries(readFileSync(changelogPath, 'utf8')));
const changelog = `${marker}\n\n${entries}\n\n[See changelog for all versions.](https://github.com/jooosi-project/windpress/blob/main/CHANGELOG.md)\n`;

writeFileSync(readmePath, readme.slice(0, markerIndex) + changelog, 'utf8');
