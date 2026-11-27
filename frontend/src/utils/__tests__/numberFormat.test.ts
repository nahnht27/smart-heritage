import { describe, it, expect } from 'vitest'
import { formatCount } from '../numberFormat'

describe('formatCount', () => {
  it('formats counts consistently with the runtime locale', () => {
    expect(formatCount(1420)).toBe((1420).toLocaleString())
  })

  it('formats 1420 with explicit English and Vietnamese locales', () => {
    expect(formatCount(1420, 'en-US')).toBe('1,420')
    expect(formatCount(1420, 'vi-VN')).toBe('1.420')
  })

  it('does not add separators to three-digit counts in either locale', () => {
    expect(formatCount(900, 'en-US')).toBe('900')
    expect(formatCount(900, 'vi-VN')).toBe('900')
  })
})
