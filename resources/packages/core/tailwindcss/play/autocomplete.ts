import Fuse from "fuse.js";
import * as csstree from "css-tree";
import { getClassList } from "../intellisense";

import type { DesignSystem } from "@tailwindcss/root/packages/tailwindcss/src/design-system";
import type { ClassEntity } from "../intellisense";
import { type VFSContainer } from "../vfs";

interface CacheEntry {
  classLists: ClassEntity[];
  volumeHash: string;
  timestamp: number;
  queryCache: Map<string, any[]>;
}

let cache: CacheEntry | null = null;

function generateVolumeHash(volume: VFSContainer): string {
  return btoa(
    JSON.stringify(
      Object.keys(volume)
        .sort()
        .map((key) => `${key}:${volume[key].length}`),
    ),
  );
}

export function invalidateCache(): void {
  cache = null;
}

export function clearQueryCache(): void {
  if (cache) {
    cache.queryCache.clear();
  }
}

export function getCacheInfo(): {
  isValid: boolean;
  timestamp: number | null;
  volumeHash: string | null;
  queryCacheSize: number;
} {
  return {
    isValid: cache !== null,
    timestamp: cache?.timestamp || null,
    volumeHash: cache?.volumeHash || null,
    queryCacheSize: cache?.queryCache.size || 0,
  };
}

export function getColor(declarations: any[] | undefined) {
  const color = declarations?.find((declaration) => declaration.property.includes("color"));

  return color?.value || null;
}

function getUserClassList(volume: VFSContainer): ClassEntity[] {
  // Collect all class names
  const classNames: Set<string> = new Set();

  const unescapedClassName = (s: string): string =>
    s
      .replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16)),
      ) // unicode escapes
      .replace(/\\([^\s])/g, "$1"); // common escapes like \:

  // loop through all the files in the volume
  for (const file of Object.keys(volume)) {
    // if the file is a .css file, parse it
    if (file.endsWith(".css")) {
      const ast = csstree.parse(volume[file]);
      csstree.walk(ast, {
        visit: "Selector",
        enter(node) {
          csstree.walk(node, {
            visit: "ClassSelector",
            enter(classNode) {
              classNames.add(unescapedClassName(classNode.name));
            },
          });
        },
      });
    }
  }

  return Array.from(classNames).map((className) => {
    return {
      kind: "user",
      selector: className,
    };
  });
}

export function searchClassList(
  volume: VFSContainer,
  design: DesignSystem,
  query: string,
  shouldFullReload: boolean = false,
) {
  const currentVolumeHash = generateVolumeHash(volume);
  const currentTimestamp = Date.now();

  // Check if we need to rebuild the cache
  const needsRebuild = shouldFullReload || !cache || cache.volumeHash !== currentVolumeHash;

  if (needsRebuild) {
    const classLists = [...getClassList(design), ...getUserClassList(volume)];

    cache = {
      classLists,
      volumeHash: currentVolumeHash,
      timestamp: currentTimestamp,
      queryCache: new Map(),
    };
  }

  const { classLists, queryCache } = cache!;

  // Check if we have a cached result for this query
  if (queryCache.has(query)) {
    return queryCache.get(query)!;
  }

  // if the query is empty, return all classList
  if (query === "") {
    const result = classLists.map((classList: ClassEntity) => {
      return {
        value: classList.selector,
        color: getColor(classList.declarations),
      };
    });
    queryCache.set(query, result);
    return result;
  }

  // split query by `:` and search for each subquery
  const segment = query.split(":");
  const prefix = segment.slice(0, -1).join(":");
  let q = segment.pop() || "";

  // if `!` exists as the first character on the query, cut it and mark as important
  let importantModifier = "";
  if (q.startsWith("!")) {
    q = q.slice(1);
    importantModifier = "!";
  }

  // check if opacity modifier is used, for example `bg-red-500/20`. the opacity modifier is a number between 0 and 100
  let opacityModifier: string | number | boolean = false;
  if (q.includes("/")) {
    const [_q, opacity] = q.split("/");
    // if the opacity modifier is not a number between 0 and 100, revert back the split
    if (opacity === "") {
      q = _q;
      opacityModifier = opacity;
    } else if (isNaN(Number(opacity)) || Number(opacity) < 0 || Number(opacity) > 100) {
      q = [_q, opacity].join("/");
    } else {
      q = _q;
      opacityModifier = parseInt(opacity.toString());
    }
  }

  let filteredClassList = classLists.filter((classList) => classList.selector.includes(q));

  // if opacityModifier is not false, populate the filteredClassList with the opacityModifier (1 to 100)
  if (opacityModifier !== false) {
    const tempFilteredClassList: ClassEntity[] = [];

    const loopIncrement = opacityModifier === "" ? 5 : 1;
    const loopStart =
      opacityModifier === "" || Number(opacityModifier) > 9
        ? 0
        : Math.floor((Number(opacityModifier) * 10 + 1) / 10) * 10;
    const loopEnd =
      opacityModifier === "" || Number(opacityModifier) > 9
        ? 100
        : Math.ceil((Number(opacityModifier) * 10 + 1) / 10) * 10;

    filteredClassList.forEach((classList: ClassEntity) => {
      for (let i = loopStart; i <= loopEnd; i += loopIncrement) {
        tempFilteredClassList.push({
          ...classList,
          selector: classList.selector + "/" + i,
        });
      }
    });

    filteredClassList = tempFilteredClassList;
  }

  const fuse = new Fuse(filteredClassList, {
    keys: ["selector"],
    threshold: 0.4,
  });

  const result = fuse.search(q).map((result) => {
    const item = result.item as ClassEntity;
    return {
      value: [prefix, (importantModifier ? "!" : "") + item.selector].filter(Boolean).join(":"),
      color: getColor(item.declarations),
    };
  });

  // Cache the result for future queries
  queryCache.set(query, result);

  return result;
}
