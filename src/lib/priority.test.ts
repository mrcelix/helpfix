import { describe, it, expect } from 'vitest'
import { priorityLabel, PRIORITY_ORDER } from './priority'

describe('priorityLabel', () => {
  it('maps every priority code to a Turkish and English label', () => {
    expect(priorityLabel('P1', 'tr')).toBe('Kritik')
    expect(priorityLabel('P1', 'en')).toBe('Critical')
    expect(priorityLabel('P4', 'tr')).toBe('Düşük')
    expect(priorityLabel('P4', 'en')).toBe('Low')
  })
})

describe('PRIORITY_ORDER', () => {
  it('is ordered from most to least critical', () => {
    expect(PRIORITY_ORDER).toEqual(['P1', 'P2', 'P3', 'P4'])
  })
})
