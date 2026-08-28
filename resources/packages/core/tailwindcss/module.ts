import path from "path";
import { encodeBase64 } from "@std/encoding/base64";
import { isValidUrl } from "./utils";

import type { VFSContainer } from "./vfs";

export async function loadModule(
  modulePath: string,
  base: string,
  resourceHint: "plugin" | "config",
  volume = {} as VFSContainer,
) {
  let module;

  if (modulePath.startsWith(".") || modulePath.startsWith("/")) {
    return importLocalModule(modulePath, base, resourceHint, volume);
  } else if (resourceHint === "plugin") {
    if (!modulePath.startsWith("http")) {
      modulePath = `https://esm.sh/${modulePath}`;
    }

    try {
      module = await importCdnModule(modulePath, base, resourceHint);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `The ${resourceHint} file "${modulePath}" could not be loaded. ${error.message}`,
        );
      } else {
        throw new Error(`The ${resourceHint} file "${modulePath}" could not be loaded.`);
      }
    }
  }

  if (!module) {
    throw new Error(`The ${resourceHint} file "${modulePath}" is not a valid module.`);
  }

  return {
    module,
    base,
  };
}

export async function importCdnModule(
  modulePath: string,
  base: string,
  resourceHint: "plugin" | "config",
) {
  const module = await import(/* @vite-ignore */ modulePath).then((m) => m.default ?? m);

  return module;
}

export async function importLocalModule(
  modulePath: string,
  base: string = "/",
  resourceHint: "plugin" | "config",
  volume = {} as VFSContainer,
) {
  base = base ?? "/";

  const _path = path.resolve(base, modulePath);

  if (!volume[_path]) {
    throw new Error(
      `The ${resourceHint} file "${path.resolve("/", modulePath)}" does not exist in the volume.`,
    );
  }

  const _moduleContent = prepareModuleContent(volume[_path], modulePath, volume);

  return {
    module: await import(
      /* @vite-ignore */ `data:text/javascript;base64,${encodeBase64(_moduleContent)}`
    ).then((m) => m.default ?? m),
    base: path.dirname(modulePath),
  };
}

export function prepareModuleContent(
  moduleContent: string,
  modulePath: string,
  volume = {} as VFSContainer,
) {
  let _moduleContent = moduleContent
    // replace the module.exports = with export default
    .replace(/module.exports\s*=\s*/, "export default ")
    // catch multi-line import statements and replace them with single line
    .replace(/import\s+({[^}]+})\s+from\s+['"](.+)['"]/g, (_, $1, $2) => {
      return `import ${$1.replace(/\n/g, "")} from '${$2}'`;
    })
    // do the rest
    .split("\n")
    .map((line) => {
      return (
        line
          // replace import statements with dynamic imports
          .replace(/\bimport\s+(.+)\s+from\s+['"](.+)['"]/g, (_, variable, m) => {
            if (!m.startsWith("http") && !m.startsWith(".") && !m.startsWith("/")) {
              m = `https://esm.sh/${m}`;
            }

            return `const ${variable.indexOf("{") === -1 ? `{default: ${variable}}` : variable.replace(/\s+as\s+/, ": ")} = await import('${m}')`;
          })

          // alias require to import
          .replace(/\brequire\(['"]([^'"]*)['"]\)/g, (_, m) => {
            // if the module is not a URL or a relative path, use esm.sh
            if (!m.startsWith("http") && !m.startsWith(".") && !m.startsWith("/")) {
              m = `https://esm.sh/${m}`;
            }

            return `(await import('${m}')).default`;
          })
      );
    })
    .join("\n");

  // Update all relative imports to absolute URLs

  // Regex to capture both static and dynamic imports
  const regex = /import\s*(?:[^'"]*\s*from\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

  const matchPositions = [];
  let match;
  let shift = 0; // Track the shift in string length due to replacements

  while ((match = regex.exec(_moduleContent)) !== null) {
    const [fullMatch, staticImport, dynamicImport] = match;
    const importPath = staticImport || dynamicImport; // Get the captured import path
    // if the importPath is valid url, skip
    if (isValidUrl(importPath)) {
      continue;
    }

    if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
      // Check if it starts with `.` or `/`
      continue; // Leave non-relative imports unchanged
    }

    // resolve the path and check if the file is in the volume
    const _path = path.resolve(path.dirname(modulePath), importPath);

    // volume are key-value pairs (relative_path: content).
    const _importModuleContent = volume[_path];

    if (!_importModuleContent) {
      throw new Error(`${modulePath}: The module file "${_path}" does not exist in the volume.`);
    }

    matchPositions.push({
      start: match.index + fullMatch.indexOf(importPath),
      end: match.index + fullMatch.indexOf(importPath) + importPath.length,
      replacement: new URL(importPath, window.windpress.user_data.data_dir.url).href,
    });
  }

  matchPositions.forEach(({ start, end, replacement }) => {
    // Slice the original string and replace the section
    _moduleContent =
      _moduleContent.slice(0, start + shift) + replacement + _moduleContent.slice(end + shift);
    // Adjust the shift due to the difference in length between the old and new strings
    shift += replacement.length - (end - start);
  });

  return _moduleContent;
}
