#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const version = process.argv[2];

if (! version || ! /^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Usage: pnpm run release <major.minor.patch>');
}

const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });

if (status.trim()) {
  throw new Error('The working tree must be clean before preparing a release.');
}

function update(relativePath, replacements) {
  const path = `${root}/${relativePath}`;
  let content = readFileSync(path, 'utf8');

  for (const [pattern, replacement] of replacements) {
    if (! pattern.test(content)) {
      throw new Error(`Could not find the version field in ${relativePath}.`);
    }

    content = content.replace(pattern, replacement);
  }

  writeFileSync(path, content, 'utf8');
}

update('readme.txt', [[/Stable tag: \d+\.\d+\.\d+/, `Stable tag: ${version}`]]);
update('constant.php', [[/public const VERSION = '\d+\.\d+\.\d+';/, `public const VERSION = '${version}';`]]);
update('windpress.php', [[/( \* Version:\s+)\d+\.\d+\.\d+/, `$1${version}`]]);
update('package.json', [[/("version": ")\d+\.\d+\.\d+("\s*,)/, `$1${version}$2`]]);

const changelogPath = `${root}/CHANGELOG.md`;
let changelog = readFileSync(changelogPath, 'utf8');

if (changelog.includes(`## [${version}]`)) {
  throw new Error(`CHANGELOG.md already contains ${version}.`);
}

const date = new Date().toISOString().slice(0, 10);
changelog = changelog.replace('## [Unreleased]', `## [Unreleased]\n\n## [${version}] - ${date}`);

const repositoryUrl = 'https://github.com/jooosi-project/windpress';
const comparisonLink = changelog.match(
  /^\[unreleased\]: https:\/\/github\.com\/jooosi-project\/windpress\/compare\/(v?\d+\.\d+\.\d+)\.\.\.HEAD$/m,
);

if (comparisonLink) {
  const versionReference = comparisonLink[1].startsWith('v') ? `v${version}` : version;

  changelog = changelog.replace(
    comparisonLink[0],
    `[unreleased]: ${repositoryUrl}/compare/${versionReference}...HEAD\n[${version}]: ${repositoryUrl}/compare/${comparisonLink[1]}...${versionReference}`,
  );
} else {
  throw new Error('Could not find the Unreleased changelog link.');
}

writeFileSync(changelogPath, changelog, 'utf8');
execFileSync('node', ['deploy/update-readme-changelog.mjs'], { cwd: root, stdio: 'inherit' });

const releaseFiles = ['CHANGELOG.md', 'constant.php', 'package.json', 'readme.txt', 'windpress.php'];
execFileSync('git', ['add', '--', ...releaseFiles], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['commit', '-m', `Prepare ${version}`], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['tag', `v${version}`], { cwd: root, stdio: 'inherit' });

process.stdout.write(`Prepared ${version}. Push the commit and tag when ready.\n`);
