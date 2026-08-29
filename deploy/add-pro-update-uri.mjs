import {
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, parse } from 'node:path';

const PRO_UPDATE_URI = 'https://jooo.si';
const pluginDirectoryArgument = process.argv[2];

if (!pluginDirectoryArgument) {
  console.error('Usage: node deploy/add-pro-update-uri.mjs <plugin-directory>');
  process.exit(1);
}

try {
  const pluginDirectory = realpathSync(pluginDirectoryArgument);

  if (!statSync(pluginDirectory).isDirectory() || pluginDirectory === parse(pluginDirectory).root) {
    throw new Error(`Invalid plugin directory: ${pluginDirectoryArgument}`);
  }

  const pluginFile = realpathSync(join(pluginDirectory, 'windpress.php'));

  if (!statSync(pluginFile).isFile()) {
    throw new Error(`Plugin file does not exist in: ${pluginDirectoryArgument}`);
  }

  const content = readFileSync(pluginFile, 'utf8');
  const existingHeader = /^[ \t]*\*[ \t]*Update URI:[ \t]*(.+)$/im.exec(content);

  if (existingHeader) {
    const existingUri = existingHeader[1].trim();

    if (existingUri !== PRO_UPDATE_URI) {
      throw new Error(`Unexpected Update URI in plugin header: ${existingUri}`);
    }

    process.exit(0);
  }

  const pluginUriPattern = /^([ \t]*\*[ \t]*Plugin URI:[^\r\n]*)(\r?\n|$)/im;

  if (!pluginUriPattern.test(content)) {
    throw new Error('Unable to add the Pro Update URI after the Plugin URI header.');
  }

  const updated = content.replace(
    pluginUriPattern,
    (_, pluginUriHeader, newline) => {
      const lineEnding = newline || '\n';
      return `${pluginUriHeader}${lineEnding} * Update URI:        ${PRO_UPDATE_URI}${lineEnding}`;
    },
  );

  writeFileSync(pluginFile, updated);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
