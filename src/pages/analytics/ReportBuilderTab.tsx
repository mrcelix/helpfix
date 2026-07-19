import { useState } from 'react'
import { Download, Save, Trash2, FileBarChart } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang, pickLang} from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import {
  useReportData,
  useCustomReports,
  useSaveCustomReport,
  useDeleteCustomReport,
  exportReportCsv,
  DATA_SOURCE_LABEL,
  GROUP_BY_LABEL,
  SUPPORTED_GROUP_BY,
  type ReportDataSource,
  type ReportGroupBy,
} from './useCustomReports'

const DATA_SOURCES: ReportDataSource[] = ['incidents', 'problems', 'changes', 'service_requests']
const DATE_RANGES = [7, 30, 90, 365]

export function ReportBuilderTab() {
  const { lang, t } = useLang()
  const [dataSource, setDataSource] = useState<ReportDataSource>('incidents')
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('category')
  const [dateRangeDays, setDateRangeDays] = useState(30)
  const [reportName, setReportName] = useState('')

  const { data: buckets, isLoading, error } = useReportData(dataSource, groupBy, dateRangeDays, lang)
  const { data: savedReports } = useCustomReports()
  const saveReport = useSaveCustomReport()
  const deleteReport = useDeleteCustomReport()
  const [saveError, setSaveError] = useState('')

  function changeSource(src: ReportDataSource) {
    setDataSource(src)
    if (!SUPPORTED_GROUP_BY[src].includes(groupBy)) setGroupBy(SUPPORTED_GROUP_BY[src][0])
  }

  function loadReport(id: string) {
    const r = savedReports?.find((r) => r.id === id)
    if (!r) return
    setDataSource(r.data_source)
    setGroupBy(r.group_by)
    setDateRangeDays(r.date_range_days)
  }

  async function handleSave() {
    if (!reportName.trim()) return
    setSaveError('')
    try {
      await saveReport.mutateAsync({ name: reportName.trim(), dataSource, groupBy, dateRangeDays })
      setReportName('')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    }
  }

  const total = buckets?.reduce((sum, b) => sum + b.count, 0) ?? 0

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-4">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius-app)] p-4">
            <h3 className="font-display text-[14px] font-bold mb-3 flex items-center gap-1.5">
              <FileBarChart className="w-4 h-4 text-brand-dim" />
              {t({ tr: 'Rapor Tanımı', en: 'Report Definition' })}
            </h3>

            <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Veri Kaynağı', en: 'Data Source' })}
            </label>
            <select
              value={dataSource}
              onChange={(e) => changeSource(e.target.value as ReportDataSource)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[13px] mb-3"
            >
              {DATA_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {pickLang(DATA_SOURCE_LABEL[s], lang)}
                </option>
              ))}
            </select>

            <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Grupla', en: 'Group By' })}
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as ReportGroupBy)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[13px] mb-3"
            >
              {SUPPORTED_GROUP_BY[dataSource].map((g) => (
                <option key={g} value={g}>
                  {pickLang(GROUP_BY_LABEL[g], lang)}
                </option>
              ))}
            </select>

            <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Tarih Aralığı', en: 'Date Range' })}
            </label>
            <div className="flex gap-1.5 mb-3.5">
              {DATE_RANGES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDateRangeDays(d)}
                  aria-pressed={dateRangeDays === d}
                  className={`flex-1 text-[11px] font-bold py-1.5 rounded-md border ${dateRangeDays === d ? 'bg-brand border-brand text-white' : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]'}`}
                >
                  {d}{t({ tr: 'g', en: 'd' })}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder={t({ tr: 'Rapor adı…', en: 'Report name…' })}
                className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
              />
              <Button
                onClick={handleSave}
                disabled={saveReport.isPending || !reportName.trim()}
                title={t({ tr: 'Raporu Kaydet', en: 'Save Report' })}
                aria-label={t({ tr: 'Raporu Kaydet', en: 'Save Report' })}
              >
                <Save className="w-[15px] h-[15px]" />
              </Button>
            </div>
            {saveError && <p className="text-[11px] text-p1 mt-1.5">{saveError}</p>}
          </div>

          {!!savedReports?.length && (
            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius-app)] p-4">
              <h3 className="font-display text-[14px] font-bold mb-2.5">{t({ tr: 'Kayıtlı Raporlar', en: 'Saved Reports' })}</h3>
              <div className="flex flex-col gap-1">
                {savedReports.map((r) => (
                  <div key={r.id} className="group flex items-center justify-between bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5">
                    <button onClick={() => loadReport(r.id)} className="text-[12px] font-semibold text-left flex-1 truncate">
                      {r.name}
                    </button>
                    <button
                      onClick={() => deleteReport.mutate(r.id)}
                      title={t({ tr: 'Raporu sil', en: 'Delete report' })}
                      aria-label={t({ tr: 'Raporu sil', en: 'Delete report' })}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-faint)] hover:text-p1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius-app)] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-[15px] font-bold">
                {pickLang(DATA_SOURCE_LABEL[dataSource], lang)} — {pickLang(GROUP_BY_LABEL[groupBy], lang)}
              </h3>
              <p className="text-[11.5px] text-[var(--text-faint)] mt-0.5">
                {t({ tr: `Son ${dateRangeDays} gün · Toplam ${total} kayıt`, en: `Last ${dateRangeDays} days · ${total} records total` })}
              </p>
            </div>
            <button
              onClick={() => exportReportCsv(buckets ?? [], `rapor_${dataSource}_${groupBy}.csv`)}
              disabled={!buckets?.length}
              className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>

          {isLoading && <div className="text-[12px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>}
          {error && <div className="text-[12px] text-p1 py-10 text-center">{t({ tr: 'Rapor verisi yüklenemedi.', en: 'Failed to load report data.' })}</div>}
          {!isLoading && !error && !buckets?.length && (
            <div className="text-[12px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Bu aralıkta veri yok.', en: 'No data in this range.' })}</div>
          )}

          {!!buckets?.length && (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} width={28} />
                  <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#17B0A7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
                      <th className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold">{pickLang(GROUP_BY_LABEL[groupBy], lang)}</th>
                      <th className="text-right px-3 py-2 text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold">{t({ tr: 'Sayı', en: 'Count' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map((b) => (
                      <tr key={b.label} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-2 font-medium">{b.label}</td>
                        <td className="px-3 py-2 text-right text-[var(--text-sub)]">{b.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
