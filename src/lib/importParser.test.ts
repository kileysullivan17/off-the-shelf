import { describe, expect, it } from 'vitest'
import { parseImport } from './importParser'

const KNOWN = ['Target', 'KTA', 'Home Depot', 'Walmart', 'Longs', 'Costco', "O'Reilly", 'Amazon', 'Daiso', 'Ross']

describe('parseImport', () => {
  it('round-trips a small messy sample', () => {
    const text = `
Target
* bibs G37
milk x 2
- sunscreen (reef-safe only)
x bagels

kta:
poi (fresh if they have it)
ramen x4 (NOT the spicy one)

HD
zip ties
`
    const rows = parseImport(text, KNOWN)
    expect(rows).toHaveLength(7)

    const [bibs, milk, sunscreen, bagels, poi, ramen, zip] = rows
    expect(bibs).toMatchObject({ name: 'bibs', store_name: 'Target', aisle_code: 'G37' })
    expect(milk).toMatchObject({ name: 'milk', quantity_note: 'x 2', store_name: 'Target' })
    expect(sunscreen).toMatchObject({ name: 'sunscreen', instruction_note: 'reef-safe only' })
    expect(bagels).toMatchObject({ name: 'bagels', store_name: 'Target' })
    expect(poi).toMatchObject({ name: 'poi', store_name: 'KTA', instruction_note: 'fresh if they have it' })
    expect(ramen).toMatchObject({ name: 'ramen', quantity_note: 'x 4', instruction_note: 'NOT the spicy one' })
    expect(zip).toMatchObject({ name: 'zip ties', store_name: 'Home Depot' })
  })

  it('captures compound aisle codes like A11B1', () => {
    const [row] = parseImport('Target\nlotion A11B1', KNOWN)
    expect(row.aisle_code).toBe('A11B1')
    expect(row.name).toBe('lotion')
  })

  it('items before any store header get a null store', () => {
    const [row] = parseImport('just eggs', KNOWN)
    expect(row).toMatchObject({ name: 'just eggs', store_name: null })
  })

  it('unknown header with a colon starts a new store section', () => {
    const rows = parseImport('Island Naturals:\nkombucha', KNOWN)
    expect(rows[0]).toMatchObject({ name: 'kombucha', store_name: 'Island Naturals' })
  })

  it('never throws on garbage', () => {
    const rows = parseImport('***\n()\nx\n\n\t\n)(x 2(', KNOWN)
    expect(Array.isArray(rows)).toBe(true)
  })

  it('does not treat lowercase words as aisle codes', () => {
    const [row] = parseImport('Target\ndog food', KNOWN)
    expect(row.aisle_code).toBeNull()
    expect(row.name).toBe('dog food')
  })
})
