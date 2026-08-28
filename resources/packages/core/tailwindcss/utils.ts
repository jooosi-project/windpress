export function isValidUrl(url: string): boolean {
  try {
    const resource: URL = new URL(url);

    return resource.protocol === "http:" || resource.protocol === "https:";
  } catch (e) {
    return false;
  }
}
