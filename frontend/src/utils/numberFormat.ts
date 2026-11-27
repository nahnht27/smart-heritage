export function formatCount(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale).format(value)
}
