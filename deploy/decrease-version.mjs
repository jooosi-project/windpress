import {
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, parse } from 'node:path';

const workDirectoryArgument = process.argv[2];

if (!workDirectoryArgument) {
  console.error('Usage: node deploy/decrease-version.mjs <plugin-directory>');
  process.exit(1);
}

function decreaseMinorVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!match) {
    throw new Error(`Invalid version string: ${version}`);
  }

  const [, major, minor, patch] = match;

  if (Number(minor) < 1) {
    throw new Error(`Cannot decrease minor version for: ${version}`);
  }

  return `${major}.${Number(minor) - 1}.${patch}`;
}

function updateFile(workDirectory, relativePath, pattern, replacement, requireMatch = true) {
  const path = join(workDirectory, relativePath);
  const content = readFileSync(path, 'utf8');
  let matchCount = 0;

  const updated = content.replace(pattern, (...arguments_) => {
    matchCount += 1;
    return replacement(...arguments_);
  });

  if (requireMatch && matchCount === 0) {
    throw new Error(`Pattern not found in file: ${path}`);
  }

  writeFileSync(path, updated);
}

try {
  const workDirectory = realpathSync(workDirectoryArgument);

  if (!statSync(workDirectory).isDirectory() || workDirectory === parse(workDirectory).root) {
    throw new Error(`Invalid plugin directory: ${workDirectoryArgument}`);
  }

  updateFile(
    workDirectory,
    'constant.php',
    /public const VERSION = '(\d+\.\d+\.\d+)';/g,
    (_, version) => `public const VERSION = '${decreaseMinorVersion(version)}';`,
  );

  updateFile(
    workDirectory,
    'windpress.php',
    /\* Version:\s+(\d+\.\d+\.\d+)/g,
    (_, version) => `* Version:             ${decreaseMinorVersion(version)}`,
  );

  updateFile(
    workDirectory,
    'readme.txt',
    /Stable tag: (\d+\.\d+\.\d+)/g,
    (_, version) => `Stable tag: ${decreaseMinorVersion(version)}`,
  );

  updateFile(
    workDirectory,
    'readme.txt',
    /= (\d+\.\d+\.\d+) - ([0-9-]+) =/g,
    (_, version, date) => `= ${decreaseMinorVersion(version)} - ${date} =`,
    false,
  );

  updateFile(
    workDirectory,
    'readme.txt',
    /= (\d+\.\d+\.\d+) =/g,
    (_, version) => `= ${decreaseMinorVersion(version)} =`,
    false,
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
