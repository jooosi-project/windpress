#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Update readme.txt with changelog from CHANGELOG.md
 *
 * This script reads the CHANGELOG.md file and updates the changelog section
 * in readme.txt with the content from the CHANGELOG.md file.
 */

import { dirname, join } from "jsr:@std/path@1";

interface ChangelogEntry {
  version: string;
  date: string;
  content: string;
}

/**
 * Parse CHANGELOG.md and extract version entries
 */
function parseChangelog(changelogContent: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = changelogContent.split("\n");

  let currentEntry: ChangelogEntry | null = null;
  let inEntry = false;

  for (const line of lines) {
    // Match version headers like "## [3.3.74] - 2026-02-20"
    const versionMatch = line.match(/^## \[(.+?)\] - (.+)$/);
    if (versionMatch) {
      // Save previous entry if exists
      if (currentEntry) {
        entries.push(currentEntry);
      }

      // Start new entry
      currentEntry = {
        version: versionMatch[1],
        date: versionMatch[2],
        content: "",
      };
      inEntry = true;
      continue;
    }

    // Stop collecting when we hit another ## or # header (not version)
    if (line.startsWith("## ") && !line.match(/^## \[.+?\] - .+$/)) {
      inEntry = false;
      continue;
    }

    // Skip the main headers
    if (line.startsWith("# ") || line.startsWith("All notable changes")) {
      continue;
    }

    // Skip comparison links at the bottom of CHANGELOG.md
    if (line.match(/^\[.+?\]: https?:\/\//)) {
      continue;
    }

    // Collect content for current entry
    if (inEntry && currentEntry) {
      // Convert markdown format to readme.txt format
      let processedLine = line;

      // Convert ### headers (Added, Fixed, etc.) to bold text
      if (line.startsWith("### ")) {
        const sectionName = line.replace("### ", "").trim();
        const sectionHeader = `**${sectionName}**`;
        processedLine = `\n${sectionHeader}\n`;
      }

      // Convert list items to readme.txt format
      if (line.startsWith("- ")) {
        const itemContent = line.substring(2).trim();
        processedLine = `* ${itemContent}`;
      }

      if (processedLine.trim()) {
        currentEntry.content += `${currentEntry.content ? "\n" : ""}${processedLine}`;
      }
    }
  }

  // Add the last entry
  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

/**
 * Convert changelog entries to readme.txt format
 */
function formatForReadme(entries: ChangelogEntry[]): string {
  let result = "";

  for (const entry of entries) {
    // Include the date in the version header
    result += `= ${entry.version} - ${entry.date} =\n`;

    // Add content
    if (entry.content.trim()) {
      result += `${entry.content}\n`;
    }
    result += "\n";
  }

  return result.trim();
}

/**
 * Update readme.txt with new changelog content
 */
function updateReadmeWithChangelog(readmeContent: string, changelogText: string): string {
  // Find the changelog section
  const changelogStartMatch = readmeContent.match(/== Changelog ==/);
  if (!changelogStartMatch) {
    throw new Error('Could not find "== Changelog ==" section in readme.txt');
  }

  const changelogStart = changelogStartMatch.index!;
  const beforeChangelog = readmeContent.substring(0, changelogStart);

  // Build the new changelog section
  const newChangelogSection = `== Changelog ==

${changelogText}

[See changelog for all versions.](https://github.com/jooosi-project/windpress/blob/main/CHANGELOG.md)`;

  return beforeChangelog + newChangelogSection;
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Get the project root directory
    const scriptDir = dirname(new URL(import.meta.url).pathname);
    const projectRoot = join(scriptDir, "..");

    // Read files
    const changelogPath = join(projectRoot, "CHANGELOG.md");
    const readmePath = join(projectRoot, "readme.txt");

    console.log("Reading CHANGELOG.md...");
    const changelogContent = await Deno.readTextFile(changelogPath);

    console.log("Reading readme.txt...");
    const readmeContent = await Deno.readTextFile(readmePath);

    console.log("Parsing changelog...");
    const entries = parseChangelog(changelogContent);
    console.log(`Found ${entries.length} changelog entries`);

    console.log("Converting to readme.txt format...");
    const readmeChangelog = formatForReadme(entries);

    console.log("Updating readme.txt...");
    const updatedReadme = updateReadmeWithChangelog(readmeContent, readmeChangelog);

    console.log("Writing updated readme.txt...");
    await Deno.writeTextFile(readmePath, updatedReadme);

    console.log("Successfully updated readme.txt with changelog from CHANGELOG.md");
  } catch (error) {
    console.error("Error:", error.message);
    Deno.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.main) {
  await main();
}
