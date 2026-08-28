import { decodeBase64, encodeBase64 } from "@std/encoding/base64";

export type VFSContainer = {
  [key: string]: string;
};

export function decodeVFSContainer(vfsContainer: string): VFSContainer {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64(vfsContainer)));
  } catch (error) {
    console.warn("Failed to decode VFS container. Falling back to polyfill.");
    return JSON.parse(atob(vfsContainer));
  }
}

export function encodeVFSContainer(vfsContainer: VFSContainer): string {
  try {
    return encodeBase64(new TextEncoder().encode(JSON.stringify(vfsContainer)));
  } catch (error) {
    console.warn("Failed to encode VFS container. Falling back to polyfill.");
    return btoa(JSON.stringify(vfsContainer));
  }
}
