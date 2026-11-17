export function isUsableMediaUrl(
  url: string | null | undefined,
): url is string {
  return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url.trim());
}
