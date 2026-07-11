import { useState } from 'react'
import { Settings, ArrowUp, ArrowDown, Check, ChevronUp, ChevronDown } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang, pickLang} from '@/contexts/LangContext'
import { priorityLabel } from '@/lib/priority'
import type { Priority } from '@/types/database'
import { ReportBuilderTab } from './ReportBuilderTab'
import { TodoWidget } from '@/components/widgets/TodoWidget'
import {
  useWeeklyTrend,
  useSlaCompliance,
  useChangeSuccessRate,
  useOpenByPriority,
  useAvgFulfillmentDays,
  useDashboardWidgets,
  useSaveDashboardLayout,
  AVAILABLE_WIDGETS,
  type WidgetType,
} from './useAnalytics'

const WIDGET_LABEL: Record<WidgetType, { tr: string; en: string }> = {
  sla_compliance: { tr: 'SLA Uyumluluğu', en: 'SLA Compliance' },
  change_success: { tr: 'Değişiklik Başarı Oranı', en: 'Change Success Rate' },
  fulfillment_time: { tr: 'Ort. Karşılama Süresi', en: 'Avg. Fulfillment Time' },
  open_records: { tr: 'Toplam Açık Kayıt', en: 'Total Open Records' },
  weekly_trend: { tr: 'Haftalık Olay Trendi', en: 'Weekly Incident Trend' },
  priority_chart: { tr: 'Önceliğe Göre Açık Kayıtlar', en: 'Open Records by Priority' },
}

export function AnalyticsPage() {
  const { lang, t } = useLang()
  const [pageTab, setPageTab] = useState<'dashboard' | 'custom-report'>('dashboard')
  const [editing, setEditing] = useState(false)
  const [draftOrder, setDraftOrder] = useState<WidgetType[] | null>(null)
  const [collapsedWidgets, setCollapsedWidgets] = useState<Set<WidgetType>>(new Set())

  function toggleCollapse(w: WidgetType) {
    setCollapsedWidgets((prev) => {
      const next = new Set(prev)
      if (next.has(w)) next.delete(w)
      else next.add(w)
      return next
    })
  }

  const { data: trend, isLoading: trendLoading } = useWeeklyTrend()
  const { data: sla } = useSlaCompliance()
  const { data: changeSuccess } = useChangeSuccessRate()
  const { data: priorityData, isLoading: priorityLoading } = useOpenByPriority()
  const { data: avgFulfillment } = useAvgFulfillmentDays()
  const { data: savedWidgets } = useDashboardWidgets()
  const saveLayout = useSaveDashboardLayout()

  const activeOrder: WidgetType[] = draftOrder ?? (savedWidgets?.map((w) => w.widget_type as WidgetType) ?? [...AVAILABLE_WIDGETS])

  const chartTrend = trend?.map((p) => ({
    week: new Date(p.week_start).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' }),
    [t({ tr: 'Oluşturulan', en: 'Created' })]: p.created_count,
    [t({ tr: 'Çözülen', en: 'Resolved' })]: p.resolved_count,
  }))

  const weekOverWeekChange =
    trend && trend.length >= 2
      ? Math.round(
          ((trend[trend.length - 1].created_count - trend[trend.length - 2].created_count) / Math.max(trend[trend.length - 2].created_count, 1)) * 100
        )
      : null

  function startEditing() {
    setDraftOrder(activeOrder)
    setEditing(true)
  }

  function toggleWidget(w: WidgetType) {
    setDraftOrder((cur) => {
      const list = cur ?? activeOrder
      return list.includes(w) ? list.filter((x) => x !== w) : [...list, w]
    })
  }

  function move(w: WidgetType, dir: -1 | 1) {
    setDraftOrder((cur) => {
      const list = [...(cur ?? activeOrder)]
      const i = list.indexOf(w)
      const j = i + dir
      if (j < 0 || j >= list.length) return list
      ;[list[i], list[j]] = [list[j], list[i]]
      return list
    })
  }

  function saveAndClose() {
    if (draftOrder) saveLayout.mutate(draftOrder)
    setEditing(false)
    setDraftOrder(null)
  }

  function renderWidget(w: WidgetType) {
    switch (w) {
      case 'sla_compliance':
        return (
          <KpiCard
            key={w}
            label={t({ tr: 'SLA Uyumluluğu (30 gün)', en: 'SLA Compliance (30d)' })}
            value={`%${sla?.compliance_percent ?? 0}`}
            sub={`${sla?.breached_count ?? 0} / ${sla?.total_resolved ?? 0} ${t({ tr: 'ihlal', en: 'breached' })}`}
            color={Number(sla?.compliance_percent ?? 100) >= 90 ? 'text-ok' : 'text-p2'}
          />
        )
      case 'change_success':
        return (
          <KpiCard
            key={w}
            label={t({ tr: 'Değişiklik Başarı Oranı', en: 'Change Success Rate' })}
            value={`%${changeSuccess?.success_percent ?? 0}`}
            sub={`${changeSuccess?.successful_count ?? 0} / ${changeSuccess?.total_closed ?? 0}`}
            color="text-brand"
          />
        )
      case 'fulfillment_time':
        return (
          <KpiCard
            key={w}
            label={t({ tr: 'Ort. Karşılama Süresi', en: 'Avg. Fulfillment Time' })}
            value={`${avgFulfillment ?? 0} ${t({ tr: 'gün', en: 'days' })}`}
            color="text-purple"
          />
        )
      case 'open_records':
        return (
          <KpiCard
            key={w}
            label={t({ tr: 'Toplam Açık Kayıt', en: 'Total Open Records' })}
            value={String(priorityData?.reduce((s, p) => s + p.count, 0) ?? 0)}
            color="text-p2"
          />
        )
      case 'weekly_trend':
        return (
          <div key={w} className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold">{pickLang(WIDGET_LABEL.weekly_trend, lang)}</span>
                {weekOverWeekChange != null && (
                  <span
                    className={`flex items-center gap-0.5 text-[10.5px] font-bold rounded-full px-1.5 py-0.5 ${
                      weekOverWeekChange > 0 ? 'bg-p1-tint text-p1' : weekOverWeekChange < 0 ? 'bg-ok/15 text-ok' : 'bg-[var(--panel-2)] text-[var(--text-faint)]'
                    }`}
                    title={t({ tr: 'Geçen haftaya göre', en: 'vs last week' })}
                  >
                    {weekOverWeekChange > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : weekOverWeekChange < 0 ? <ArrowDown className="w-2.5 h-2.5" /> : null}
                    {Math.abs(weekOverWeekChange)}%
                  </span>
                )}
              </div>
              <button onClick={() => toggleCollapse(w)} className="text-[var(--text-faint)] hover:text-[var(--text)]">
                {collapsedWidgets.has(w) ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
            {!collapsedWidgets.has(w) &&
              (trendLoading ? (
                <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartTrend}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4C6FFF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4C6FFF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#17B0A7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#17B0A7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                    <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey={t({ tr: 'Oluşturulan', en: 'Created' })} stroke="#4C6FFF" fill="url(#colorCreated)" strokeWidth={2} />
                    <Area type="monotone" dataKey={t({ tr: 'Çözülen', en: 'Resolved' })} stroke="#17B0A7" fill="url(#colorResolved)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ))}
          </div>
        )
      case 'priority_chart':
        return (
          <div key={w} className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 col-span-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-bold">{pickLang(WIDGET_LABEL.priority_chart, lang)}</span>
              <button onClick={() => toggleCollapse(w)} className="text-[var(--text-faint)] hover:text-[var(--text)]">
                {collapsedWidgets.has(w) ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
            {!collapsedWidgets.has(w) &&
              (priorityLoading ? (
                <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={priorityData?.map((d) => ({ ...d, priority: priorityLabel(d.priority as Priority, lang) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="priority" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {priorityData?.map((_, i) => (
                        <Cell key={i} fill={['#EF4444', '#F5A524', '#4C6FFF', '#8B95A8'][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ))}
          </div>
        )
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Raporlama & Analitik', en: 'Reporting & Analytics' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Tüm modüllerin gerçek zamanlı özeti — kendi dashboard\'ınızı özelleştirin', en: 'Real-time summary across all modules — customize your own dashboard' })}
          </p>
        </div>
        {pageTab === 'dashboard' &&
          (!editing ? (
            <button onClick={startEditing} className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim">
              <Settings className="w-[14px] h-[14px]" />
              {t({ tr: "Dashboard'ı Özelleştir", en: 'Customize Dashboard' })}
            </button>
          ) : (
            <button onClick={saveAndClose} className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-lg bg-brand text-white">
              <Check className="w-[14px] h-[14px]" />
              {t({ tr: 'Kaydet', en: 'Save' })}
            </button>
          ))}
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-5 overflow-x-auto">
        <button
          onClick={() => setPageTab('dashboard')}
          className={`shrink-0 whitespace-nowrap px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'dashboard' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Dashboard', en: 'Dashboard' })}
        </button>
        <button
          onClick={() => setPageTab('custom-report')}
          className={`shrink-0 whitespace-nowrap px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'custom-report' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Özel Rapor', en: 'Custom Report' })}
        </button>
      </div>

      {pageTab === 'custom-report' ? (
        <ReportBuilderTab />
      ) : (
        <>

      {editing && (
        <div className="bg-purple-tint/40 border border-purple/40 rounded-xl p-3.5 mb-5">
          <div className="text-[11px] font-bold text-purple uppercase mb-2.5">
            {t({ tr: 'Widget Seç & Sırala', en: 'Select & Reorder Widgets' })}
          </div>
          <div className="space-y-1.5">
            {(draftOrder ?? activeOrder).map((w) => (
              <div key={w} className="flex items-center gap-2 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2">
                <span className="flex-1 text-[12px] font-semibold">{pickLang(WIDGET_LABEL[w], lang)}</span>
                <button onClick={() => move(w, -1)}><ArrowUp className="w-3.5 h-3.5 text-[var(--text-faint)]" /></button>
                <button onClick={() => move(w, 1)}><ArrowDown className="w-3.5 h-3.5 text-[var(--text-faint)]" /></button>
                <button onClick={() => toggleWidget(w)} className="text-[10.5px] font-bold text-p1 ml-2">
                  {t({ tr: 'Kaldır', en: 'Remove' })}
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {AVAILABLE_WIDGETS.filter((w) => !(draftOrder ?? activeOrder).includes(w)).map((w) => (
              <button
                key={w}
                onClick={() => toggleWidget(w)}
                className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-full border border-dashed border-[var(--border)] text-[var(--text-faint)]"
              >
                + {pickLang(WIDGET_LABEL[w], lang)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3.5">
        {activeOrder.map(renderWidget)}
        <TodoWidget />
      </div>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4">
      <div className={`font-display text-[22px] font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-[var(--text-faint)] mt-1">{label}</div>
      {sub && <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{sub}</div>}
    </div>
  )
}
