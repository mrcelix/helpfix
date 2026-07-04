/** "12 dk önce" / "12 min ago" gibi bağıl zaman metni üretir. */
export function relativeTime(iso: string, lang: 'tr' | 'en'): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffSec = Math.floor(diffMs / 1000)

  const units: [number, { tr: string; en: string }][] = [
    [60, { tr: 'sn', en: 'sec' }],
    [60, { tr: 'dk', en: 'min' }],
    [24, { tr: 'sa', en: 'hr' }],
    [30, { tr: 'gün', en: 'day' }],
    [12, { tr: 'ay', en: 'mo' }],
    [Number.MAX_SAFE_INTEGER, { tr: 'yıl', en: 'yr' }],
  ]

  let value = diffSec
  for (const [factor, label] of units) {
    if (value < factor) {
      const rounded = Math.max(1, Math.floor(value))
      return lang === 'tr' ? `${rounded} ${label.tr} önce` : `${rounded} ${label.en} ago`
    }
    value = Math.floor(value / factor)
  }
  return lang === 'tr' ? 'az önce' : 'just now'
}

/** Basit CSV dışa aktarma — verilen satırları indirilebilir bir dosyaya dönüştürür. */
export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
