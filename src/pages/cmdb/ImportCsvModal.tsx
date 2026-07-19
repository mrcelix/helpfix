import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CiType } from '@/types/database'

const VALID_TYPES: CiType[] = ['laptop', 'desktop', 'server', 'network_device', 'mobile_device', 'software_license', 'other']

/** Basit CSV ayrıştırıcı — tırnaklı alanları destekler, harici kütüphane
 * gerektirmez (Faz BL'deki CSV dışa aktarma ile aynı "hafif" yaklaşım). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    if (row.some((f) => f.trim() !== '')) rows.push(row)
  }
  return rows
}

interface ParsedAsset {
  name: string
  ci_type: CiType
  serial_number: string
  vendor: string
  cost: number | null
  warranty_expiry: string | null
  error: string | null
}

export function ImportCsvModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<ParsedAsset[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number; errorMessage?: string } | null>(null)

  function handleParse() {
    const rows = parseCsv(raw.trim())
    if (!rows.length) {
      setParsed([])
      return
    }
    const header = rows[0].map((h) => h.trim().toLowerCase())
    const dataRows = rows.slice(1)
    const idx = (key: string) => header.indexOf(key)

    const items: ParsedAsset[] = dataRows.map((r) => {
      const name = (r[idx('ad')] ?? '').trim()
      const typeRaw = (r[idx('tip')] ?? 'other').trim().toLowerCase() as CiType
      const ci_type = VALID_TYPES.includes(typeRaw) ? typeRaw : 'other'
      const costRaw = (r[idx('maliyet')] ?? '').trim()
      const warrantyRaw = (r[idx('garanti_bitis')] ?? '').trim()

      const cost = costRaw ? Number(costRaw.replace(',', '.')) : null

      let error: string | null = null
      if (!name) error = t({ tr: "'ad' alanı boş olamaz", en: "'ad' field cannot be empty" })
      else if (cost != null && Number.isNaN(cost)) error = t({ tr: "'maliyet' sayısal olmalı", en: "'cost' must be numeric" })

      return {
        name,
        ci_type,
        serial_number: (r[idx('seri_no')] ?? '').trim(),
        vendor: (r[idx('tedarikci')] ?? '').trim(),
        cost,
        warranty_expiry: warrantyRaw || null,
        error,
      }
    })
    setParsed(items)
  }

  async function handleImport() {
    if (!parsed || !profile) return
    const validItems = parsed.filter((i) => !i.error)
    setImporting(true)
    let success = 0
    let failed = 0

    const { error } = await supabase.from('configuration_items').insert(
      validItems.map((i) => ({
        tenant_id: profile.tenantId,
        name: i.name,
        ci_type: i.ci_type,
        status: 'active' as const,
        serial_number: i.serial_number || null,
        assigned_user_id: null,
        vendor: i.vendor || null,
        cost: i.cost,
        purchase_date: null,
        warranty_expiry: i.warranty_expiry,
        notes: null,
      }))
    )

    if (error) {
      // Tek bir toplu insert olduğu için tek satırlık bir kısıt ihlali TÜM
      // grubu başarısız kılar (atomik) — sadece bir sayı göstermek yerine
      // sunucudan gelen gerçek hatayı da gösteriyoruz ki kullanıcı HANGİ
      // satırın sorunlu olduğunu tahmin edebilsin (ör. tarih formatı).
      failed = validItems.length
      setResult({ success, failed, errorMessage: error.message })
    } else {
      success = validItems.length
      setResult({ success, failed })
    }
    setImporting(false)
    qc.invalidateQueries({ queryKey: ['cmdb'] })
  }

  const validCount = parsed?.filter((i) => !i.error).length ?? 0
  const errorCount = parsed?.filter((i) => i.error).length ?? 0

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'CSV ile Toplu Varlık İçe Aktar', en: 'Bulk Import Assets from CSV' })}
      footer={
        result ? (
          <Button onClick={onClose}>{t({ tr: 'Kapat', en: 'Close' })}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t({ tr: 'Vazgeç', en: 'Cancel' })}
            </Button>
            {parsed ? (
              <Button onClick={handleImport} disabled={importing || validCount === 0}>
                {importing
                  ? t({ tr: 'İçe aktarılıyor…', en: 'Importing…' })
                  : t({ tr: `${validCount} Varlığı İçe Aktar`, en: `Import ${validCount} Assets` })}
              </Button>
            ) : (
              <Button onClick={handleParse} disabled={!raw.trim()}>
                {t({ tr: 'Önizle', en: 'Preview' })}
              </Button>
            )}
          </>
        )
      }
    >
      {result ? (
        <div className="text-center py-6">
          <Check className="w-10 h-10 text-ok mx-auto mb-3" />
          <p className="text-[14px] font-semibold">
            {t({ tr: `${result.success} varlık başarıyla eklendi.`, en: `${result.success} assets added successfully.` })}
          </p>
          {result.failed > 0 && (
            <>
              <p className="text-[12px] text-p1 mt-1">{t({ tr: `${result.failed} kayıt eklenemedi.`, en: `${result.failed} records failed.` })}</p>
              {result.errorMessage && <p className="text-[11px] text-[var(--text-faint)] mt-1">{result.errorMessage}</p>}
            </>
          )}
        </div>
      ) : !parsed ? (
        <div className="space-y-3">
          <p className="text-[12px] text-[var(--text-faint)]">
            {t({
              tr: 'CSV içeriğini aşağıya yapıştırın. İlk satır başlık olmalı: ad, tip, seri_no, tedarikci, maliyet, garanti_bitis (tip: laptop/desktop/server/network_device/mobile_device/software_license/other).',
              en: 'Paste CSV content below. First row must be headers: ad, tip, seri_no, tedarikci, maliyet, garanti_bitis.',
            })}
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={10}
            placeholder={'ad,tip,seri_no,tedarikci,maliyet,garanti_bitis\nDell Latitude 5440,laptop,SN12345,Dell,35000,2027-06-01'}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[12px] font-mono resize-none"
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-ok">
              <Check className="w-4 h-4" />
              {validCount} {t({ tr: 'geçerli', en: 'valid' })}
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-p1">
                <AlertTriangle className="w-4 h-4" />
                {errorCount} {t({ tr: 'hatalı', en: 'invalid' })}
              </span>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto border border-[var(--border)] rounded-lg">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-[var(--panel-2)] border-b border-[var(--border)] sticky top-0">
                  <th className="text-left px-2.5 py-1.5">{t({ tr: 'Ad', en: 'Name' })}</th>
                  <th className="text-left px-2.5 py-1.5">{t({ tr: 'Tip', en: 'Type' })}</th>
                  <th className="text-left px-2.5 py-1.5">{t({ tr: 'Durum', en: 'Status' })}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((i, idx) => (
                  <tr key={idx} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-2.5 py-1.5">{i.name || '—'}</td>
                    <td className="px-2.5 py-1.5 text-[var(--text-faint)]">{i.ci_type}</td>
                    <td className="px-2.5 py-1.5">
                      {i.error ? <span className="text-p1">{i.error}</span> : <span className="text-ok">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
