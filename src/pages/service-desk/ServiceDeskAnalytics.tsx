import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Star } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useChannelDistribution, useTechnicianCsatLeaderboard, useDailyVolume } from './useIncidents'

const CHANNEL_LABEL: Record<string, { tr: string; en: string }> = {
  portal: { tr: 'Portal', en: 'Portal' },
  email: { tr: 'E-posta', en: 'Email' },
  chat: { tr: 'Sohbet', en: 'Chat' },
  phone: { tr: 'Telefon', en: 'Phone' },
  teams: { tr: 'Teams', en: 'Teams' },
}
const CHANNEL_COLORS = ['#4C6FFF', '#17B0A7', '#F5A524', '#A78BFA', '#8B95A8']

export function ServiceDeskAnalytics() {
  const { lang, t } = useLang()
  const { data: channels, isLoading: channelsLoading } = useChannelDistribution()
  const { data: leaderboard, isLoading: leaderboardLoading } = useTechnicianCsatLeaderboard()
  const { data: dailyVolume, isLoading: volumeLoading } = useDailyVolume()

  const volumeChartData = dailyVolume?.map((d) => ({
    day: new Date(d.day).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' }),
    [t({ tr: 'Açılan', en: 'Opened' })]: d.created_count,
    [t({ tr: 'Çözülen', en: 'Resolved' })]: d.resolved_count,
  }))

  const chartData = channels?.map((c) => ({ channel: CHANNEL_LABEL[c.channel]?.[lang] ?? c.channel, count: c.ticket_count }))

  return (
    <div>
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 mb-4">
        <div className="text-[13px] font-bold mb-1">{t({ tr: '14 Günlük Talep Hacmi', en: '14-Day Ticket Volume' })}</div>
        <div className="text-[11px] text-[var(--text-faint)] mb-4">{t({ tr: 'Açılan vs çözülen', en: 'Opened vs resolved' })}</div>
        {volumeLoading ? (
          <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={volumeChartData}>
              <defs>
                <linearGradient id="sdColorOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4C6FFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4C6FFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sdColorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#17B0A7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#17B0A7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 10.5, fill: 'var(--text-faint)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey={t({ tr: 'Açılan', en: 'Opened' })} stroke="#4C6FFF" fill="url(#sdColorOpened)" strokeWidth={2} />
              <Area type="monotone" dataKey={t({ tr: 'Çözülen', en: 'Resolved' })} stroke="#17B0A7" fill="url(#sdColorResolved)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
        <div className="text-[13px] font-bold mb-1">{t({ tr: 'Kanal Dağılımı', en: 'Channel Distribution' })}</div>
        <div className="text-[11px] text-[var(--text-faint)] mb-4">{t({ tr: 'Son 30 gün', en: 'Last 30 days' })}</div>
        {channelsLoading ? (
          <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
        ) : !chartData?.length ? (
          <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Henüz veri yok.', en: 'No data yet.' })}</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="channel" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
        <div className="text-[13px] font-bold mb-1">{t({ tr: 'Teknisyen CSAT Lider Tablosu', en: 'Technician CSAT Leaderboard' })}</div>
        <div className="text-[11px] text-[var(--text-faint)] mb-4">{t({ tr: 'Son 90 gün', en: 'Last 90 days' })}</div>
        {leaderboardLoading ? (
          <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
        ) : !leaderboard?.length ? (
          <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Henüz CSAT verisi yok.', en: 'No CSAT data yet.' })}</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((tech, i) => (
              <div key={tech.technician_id} className="flex items-center gap-3 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5">
                <span className="text-[11px] font-bold text-[var(--text-faint)] w-4">{i + 1}</span>
                <span className="flex-1 text-[12.5px] font-semibold truncate">{tech.full_name}</span>
                <span className="text-[11px] text-[var(--text-faint)]">{tech.ticket_count} {t({ tr: 'talep', en: 'tickets' })}</span>
                <span className="flex items-center gap-1 text-[12px] font-bold text-p2">
                  <Star className="w-3.5 h-3.5 fill-p2" />
                  {tech.avg_csat}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
