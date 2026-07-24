import { describe, it, expect } from 'vitest'
import { isFieldVisible, type FormFieldSchema } from './DynamicFields'

describe('isFieldVisible', () => {
  it('is always visible when there is no showIf condition', () => {
    const field: FormFieldSchema = { key: 'notes', label: 'Notes', type: 'text' }
    expect(isFieldVisible(field, {})).toBe(true)
  })

  it('is hidden when the dependency value does not match', () => {
    const field: FormFieldSchema = {
      key: 'ram',
      label: 'RAM',
      type: 'select',
      showIf: { field: 'device_type', equals: 'Laptop' },
    }
    expect(isFieldVisible(field, { device_type: 'Monitor' })).toBe(false)
  })

  it('is visible once the dependency value matches', () => {
    const field: FormFieldSchema = {
      key: 'ram',
      label: 'RAM',
      type: 'select',
      showIf: { field: 'device_type', equals: 'Laptop' },
    }
    expect(isFieldVisible(field, { device_type: 'Laptop' })).toBe(true)
  })

  it('is hidden when the dependency has not been answered yet', () => {
    const field: FormFieldSchema = {
      key: 'ram',
      label: 'RAM',
      type: 'select',
      showIf: { field: 'device_type', equals: 'Laptop' },
    }
    expect(isFieldVisible(field, {})).toBe(false)
  })
})
