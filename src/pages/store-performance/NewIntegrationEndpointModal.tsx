import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateIntegrationEndpoint } from './useIntegrations'
import { useSites } from '@/pages/admin/useSites'

const INTERVAL_OPTIONS = [5, 15, 30, 60, 240, 1440]

export function NewIntegrationEndpointModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const createEndpoint = useCreateIntegrationEndpoint()
  const { data: sites } = useSites()

  const [siteId, setSiteId] = useState('')
  const [name, setName] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [httpMethod, setHttpMethod] = useState('GET')
  const [authHeaderName, setAuthHeaderName] = useState('')
  const [authHeaderValue, setAuthHeaderValue] = useState('')
  const [pollIntervalMinutes, setPollIntervalMinutes] = useState(15)

  async function handleSubmit() {
    if (!siteId || !name.trim() || !endpointUrl.trim()) return
    await createEndpoint.mutateAsync({
      siteId,
      name: name.trim(),
      endpointUrl: endpointUrl.trim(),
      httpMethod,
      authHeaderName: authHeaderName.trim(),
      authHeaderValue: authHeaderValue.trim(),
      pollIntervalMinutes,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Entegrasyon Uç Noktası', en: 'New Integration Endpoint' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createEndpoint.isPending || !siteId || !name.trim() || !endpointUrl.trim()}>
            {createEndpoint.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Oluştur', en: 'Create' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Mağaza', en: 'Store' })}</label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]">
              <option value="">{t({ tr: 'Seçin…', en: 'Select…' })}</option>
              {sites?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Ad', en: 'Name' })}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t({ tr: 'örn. ESL İzleme Sistemi', en: 'e.g. ESL Monitoring System' })}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-[90px_1fr] gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Metod', en: 'Method' })}</label>
            <select value={httpMethod} onChange={(e) => setHttpMethod(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2 py-2.5 text-[13px]">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'JSON API Adresi', en: 'JSON API URL' })}</label>
            <input
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://izleme.example.com/api/devices"
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Kimlik Doğrulama Başlığı (opsiyonel)', en: 'Auth Header (optional)' })}</label>
            <input
              value={authHeaderName}
              onChange={(e) => setAuthHeaderName(e.target.value)}
              placeholder="X-API-Key"
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Değer', en: 'Value' })}</label>
            <input
              type="password"
              value={authHeaderValue}
              onChange={(e) => setAuthHeaderValue(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Senkronizasyon Aralığı', en: 'Sync Interval' })}</label>
          <select
            value={pollIntervalMinutes}
            onChange={(e) => setPollIntervalMinutes(Number(e.target.value))}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]"
          >
            {INTERVAL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m < 60 ? t({ tr: `${m} dakikada bir`, en: `Every ${m} minutes` }) : m < 1440 ? t({ tr: `${m / 60} saatte bir`, en: `Every ${m / 60}h` }) : t({ tr: 'Günde bir', en: 'Once a day' })}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[10.5px] text-[var(--text-faint)] bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5">
          {t({
            tr: 'Uç nokta, şu formatta bir JSON yanıt döndürmeli: { "devices": [ { "tag": "ESL-001", "online": true }, ... ] }. Etiketler (tag), CMDB\'deki cihaz etiketleriyle eşleşmelidir.',
            en: 'The endpoint must return JSON in this shape: { "devices": [ { "tag": "ESL-001", "online": true }, ... ] }. Tags must match device tags in the CMDB.',
          })}
        </p>
      </div>
    </Modal>
  )
}
