import { describe, it, expect } from 'vitest'
import { relativeTime } from './format'

function isoSecondsAgo(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString()
}

describe('relativeTime', () => {
  it('formats seconds in Turkish', () => {
    expect(relativeTime(isoSecondsAgo(5), 'tr')).toBe('5 sn önce')
  })

  it('formats seconds in English', () => {
    expect(relativeTime(isoSecondsAgo(5), 'en')).toBe('5 sec ago')
  })

  it('rolls seconds up into minutes', () => {
    expect(relativeTime(isoSecondsAgo(125), 'en')).toBe('2 min ago')
  })

  it('rolls minutes up into hours', () => {
    expect(relativeTime(isoSecondsAgo(3 * 3600 + 60), 'en')).toBe('3 hr ago')
  })

  it('rolls hours up into days', () => {
    expect(relativeTime(isoSecondsAgo(2 * 24 * 3600), 'tr')).toBe('2 gün önce')
  })

  it('never shows zero — floors at 1 unit', () => {
    expect(relativeTime(isoSecondsAgo(0), 'en')).toBe('1 sec ago')
  })
})
