// Adapted from Lightning CSS v1.33.0.
const BROWSER_MAPPING = {
  and_chr: 'chrome',
  and_ff: 'firefox',
  ie_mob: 'ie',
  op_mob: 'opera',
  and_qq: null,
  and_uc: null,
  baidu: null,
  bb: null,
  kaios: null,
  op_mini: null,
};

export function browserslistToTargets(browserslist) {
  const targets = {};

  for (const browser of browserslist) {
    const [name, versionString] = browser.split(' ');
    if (BROWSER_MAPPING[name] === null) {
      continue;
    }

    const version = parseVersion(versionString);
    if (version === null) {
      continue;
    }

    if (targets[name] === undefined || version < targets[name]) {
      targets[name] = version;
    }
  }

  return targets;
}

function parseVersion(version) {
  const [major, minor = 0, patch = 0] = version
    .split('-')[0]
    .split('.')
    .map((part) => Number.parseInt(part, 10));

  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    return null;
  }

  return (major << 16) | (minor << 8) | patch;
}
