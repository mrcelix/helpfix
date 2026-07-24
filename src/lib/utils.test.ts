import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    const disabled = false
    expect(cn('a', disabled && 'b', undefined, 'c')).toBe('a c')
  })

  it('flattens conditional object syntax', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active')
  })
})
