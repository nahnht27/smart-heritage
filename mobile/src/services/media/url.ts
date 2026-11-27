export function isUsableMediaUrl(
  url: string | null | undefined,
): url is string {
  return typeof url === 'string' && /^(https?|file):\/\/\S+$/i.test(url.trim());
}
