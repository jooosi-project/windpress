#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

/**
 * Get the current date in YYYY-MM-DD format
 */
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Update version in a file with specific pattern
 */
function updateVersionInFile(filePath, version, patterns) {
  console.log(`Updating version in ${filePath}...`);

  let content = readFileSync(filePath, "utf8");

  patterns.forEach((pattern) => {
    const regex = new RegExp(pattern.search, "g");
    content = content.replace(regex, pattern.replace.replace("${version}", version));
  });

  writeFileSync(filePath, content, "utf8");
  console.log(`✓ Updated ${filePath}`);
}

/**
 * Extract semantic version from dependency range string
 */
function extractVersionFromRange(range, dependencyName) {
  if (typeof range !== "string") {
    throw new Error(`Dependency ${dependencyName} is missing or invalid in package.json`);
  }

  const match = range.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  if (match) {
    return match[0];
  }

  const lockfileVersion = extractVersionFromLockfile(dependencyName);
  if (lockfileVersion) {
    return lockfileVersion;
  }

  throw new Error(`Could not extract version from ${dependencyName}: ${range}`);
}

/**
 * Extract resolved semantic version from pnpm-lock.yaml for aliased dependencies.
 */
function extractVersionFromLockfile(dependencyName) {
  const lockfilePath = join(rootDir, "pnpm-lock.yaml");
  const lockfile = readFileSync(lockfilePath, "utf8");
  const dependencyPattern = new RegExp(
    `${dependencyName}:\\n\\s+specifier: [^\\n]+\\n\\s+version: (?:[^@\\n]+@)?(\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?)`,
  );
  const match = lockfile.match(dependencyPattern);

  return match?.[1] ?? null;
}

/**
 * Read bundled Tailwind CSS versions from package.json
 */
function getBundledTailwindVersions() {
  const packageJsonPath = join(rootDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  return {
    tw3: extractVersionFromRange(packageJson.dependencies?.tailwindcss3, "tailwindcss3"),
    tw4: extractVersionFromRange(packageJson.dependencies?.tailwindcss, "tailwindcss"),
  };
}

/**
 * Update readme.txt Tailwind CSS version block from package.json
 */
function updateReadmeTailwindVersions() {
  console.log("Updating Tailwind CSS versions in readme.txt...");

  const readmePath = join(rootDir, "readme.txt");
  const { tw3, tw4 } = getBundledTailwindVersions();
  let content = readFileSync(readmePath, "utf8");

  const versionBlockPattern = /\*\*Tailwind CSS version\*\*:\n- [^\n]+\n- [^\n]+/;

  if (!versionBlockPattern.test(content)) {
    throw new Error("Tailwind CSS version block not found in readme.txt");
  }

  content = content.replace(versionBlockPattern, `**Tailwind CSS version**:\n- ${tw3}\n- ${tw4}`);

  writeFileSync(readmePath, content, "utf8");
  console.log(`✓ Updated readme.txt Tailwind CSS versions: ${tw3}, ${tw4}`);
}

/**
 * Update CHANGELOG.md to replace Unreleased with current date and add new Unreleased section
 */
function updateChangelog(version) {
  console.log("Updating CHANGELOG.md...");

  const changelogPath = join(rootDir, "CHANGELOG.md");
  let content = readFileSync(changelogPath, "utf8");

  // Replace [Unreleased] with [version] - date and add new [Unreleased] section
  const currentDate = getCurrentDate();
  const unreleasedPattern = /## \[Unreleased\]/g;
  const replacement = `## [Unreleased]

## [${version}] - ${currentDate}`;

  content = content.replace(unreleasedPattern, replacement);

  // Update the links section at the bottom
  // First, find the current latest version from the unreleased link
  const unreleasedLinkPattern =
    /\[unreleased\]: https:\/\/github\.com\/wind-press\/windpress\/compare\/v?([0-9]+\.[0-9]+\.[0-9]+)\.\.\.HEAD/;
  const match = content.match(unreleasedLinkPattern);

  if (match) {
    const previousVersion = match[1];

    // Update the unreleased link to point to the new version
    content = content.replace(
      unreleasedLinkPattern,
      `[unreleased]: https://github.com/jooosi-project/windpress/compare/v${version}...HEAD`,
    );

    // Add the new version comparison link after the unreleased link
    const linksSection = content.match(/(\[unreleased\]: .+)$/m);
    if (linksSection) {
      const insertPosition = content.indexOf(linksSection[0]) + linksSection[0].length;
      const newVersionLink = `\n[${version}]: https://github.com/jooosi-project/windpress/compare/v${previousVersion}...v${version}`;
      content = content.slice(0, insertPosition) + newVersionLink + content.slice(insertPosition);
    }
  }

  writeFileSync(changelogPath, content, "utf8");
  console.log(`✓ Updated CHANGELOG.md with version header and comparison links`);
}

/**
 * Execute git commands
 */
function executeGitCommands(version) {
  console.log("Creating git commit and tag...");

  try {
    // Add all changes
    console.log("Adding files to git...");
    execSync("git add .", { stdio: "inherit", cwd: rootDir });

    // Commit changes following the pattern "Update VERSION for x.x.x"
    const commitMessage = `Update VERSION for ${version}`;
    console.log(`Committing changes: ${commitMessage}`);
    execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit", cwd: rootDir });

    // Create tag
    const tagName = `v${version}`;
    console.log(`Creating tag: ${tagName}`);
    execSync(`git tag ${tagName}`, { stdio: "inherit", cwd: rootDir });

    console.log("✓ Git commit and tag created successfully");
  } catch (error) {
    console.error("❌ Error during git operations:", error.message);
    throw error;
  }
}

/**
 * Main release function
 */
function release() {
  // Get version from command line argument
  const version = process.argv[2];

  if (!version) {
    console.error("❌ Please provide a version number");
    console.log("Usage: node release.js <version>");
    console.log("Example: node release.js 3.3.46");
    process.exit(1);
  }

  // Validate version format (basic semver check)
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(version)) {
    console.error("❌ Invalid version format. Please use semantic versioning (e.g., 3.3.46)");
    process.exit(1);
  }

  console.log(`🚀 Starting release process for version ${version}...`);

  try {
    // Update readme.txt
    updateVersionInFile(join(rootDir, "readme.txt"), version, [
      {
        search: "Stable tag: [0-9]+\\.[0-9]+\\.[0-9]+",
        replace: `Stable tag: ${version}`,
      },
    ]);

    // Sync Tailwind CSS versions in readme.txt from package.json
    updateReadmeTailwindVersions();

    // Update constant.php
    updateVersionInFile(join(rootDir, "constant.php"), version, [
      {
        search: "public const VERSION = '[0-9]+\\.[0-9]+\\.[0-9]+';",
        replace: `public const VERSION = '${version}';`,
      },
    ]);

    // Update windpress.php
    updateVersionInFile(join(rootDir, "windpress.php"), version, [
      {
        search: " \\* Version:\\s+[0-9]+\\.[0-9]+\\.[0-9]+",
        replace: ` * Version:             ${version}`,
      },
    ]);

    // Update CHANGELOG.md
    updateChangelog(version);

    // Execute git commands
    executeGitCommands(version);

    console.log("✅ Release process completed successfully!");
    console.log("");
    console.log("📋 Next steps:");
    console.log("1. Push changes: git push && git push --tags");
  } catch (error) {
    console.error("❌ Error during release process:", error.message);
    process.exit(1);
  }
}

// Run the release process
release();
