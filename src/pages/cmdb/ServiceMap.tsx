import { useMemo } from 'react'
import { ReactFlow, Background, Controls, MarkerType, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useLang, pickLang } from '@/contexts/LangContext'
import { useServiceMap } from './useCmdb'

const TYPE_COLOR: Record<string, string> = {
  server: '#4C6FFF',
  laptop: '#17B0A7',
  desktop: '#17B0A7',
  network_device: '#F5A524',
  software_license: '#A78BFA',
  mobile_device: '#17B0A7',
  other: '#8B95A8',
}

const REL_LABEL: Record<string, { tr: string; en: string }> = {
  depends_on: { tr: 'bağımlı', en: 'depends on' },
  hosted_on: { tr: 'barındırılıyor', en: 'hosted on' },
  connected_to: { tr: 'bağlı', en: 'connected to' },
}

export function ServiceMap() {
  const { lang, t } = useLang()
  const { data, isLoading, error } = useServiceMap()

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] }

    // Basit dairesel yerleşim — bağlı olan CI'lar merkeze, izole
    // olanlar dışa yerleştirilir. Gerçek bir force-layout değil ama
    // her render'da deterministik ve okunabilir.
    const connectedIds = new Set<string>()
    data.edges.forEach((e) => {
      connectedIds.add(e.source_ci_id)
      connectedIds.add(e.target_ci_id)
    })

    const connected = data.nodes.filter((n) => connectedIds.has(n.id))
    const isolated = data.nodes.filter((n) => !connectedIds.has(n.id))

    const nodes: Node[] = [
      ...connected.map((n, i) => {
        const angle = (2 * Math.PI * i) / Math.max(connected.length, 1)
        const radius = 220
        return {
          id: n.id,
          position: { x: 400 + radius * Math.cos(angle), y: 280 + radius * Math.sin(angle) },
          data: { label: n.name },
          style: {
            background: 'var(--panel)',
            border: `2px solid ${TYPE_COLOR[n.ci_type] ?? '#8B95A8'}`,
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text)',
            opacity: n.status === 'retired' ? 0.4 : 1,
          },
        }
      }),
      ...isolated.map((n, i) => ({
        id: n.id,
        position: { x: 60 + (i % 6) * 110, y: 560 + Math.floor(i / 6) * 70 },
        data: { label: n.name },
        style: {
          background: 'var(--panel-2)',
          border: '1px dashed var(--border)',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 10,
          color: 'var(--text-faint)',
        },
      })),
    ]

    const edges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source_ci_id,
      target: e.target_ci_id,
      label: (REL_LABEL[e.relationship_type] ? pickLang(REL_LABEL[e.relationship_type], lang) : undefined),
      labelStyle: { fontSize: 9, fill: 'var(--text-faint)' },
      style: { stroke: 'var(--border)' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-faint)' },
      animated: e.relationship_type === 'depends_on',
    }))

    return { nodes, edges }
  }, [data, lang])

  if (isLoading) {
    return <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
  }

  if (error) {
    return (
      <p className="text-p1 text-sm py-16 text-center">
        {t({ tr: 'Servis haritası yüklenemedi.', en: 'Failed to load the service map.' })}
      </p>
    )
  }

  if (!data?.nodes.length) {
    return (
      <p className="text-[var(--text-faint)] text-sm py-16 text-center">
        {t({ tr: 'Henüz varlık eklenmedi.', en: 'No assets added yet.' })}
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 text-[11px] text-[var(--text-faint)]">
        <LegendDot color="#4C6FFF" label={t({ tr: 'Sunucu', en: 'Server' })} />
        <LegendDot color="#17B0A7" label={t({ tr: 'Cihaz', en: 'Device' })} />
        <LegendDot color="#F5A524" label={t({ tr: 'Ağ Cihazı', en: 'Network' })} />
        <LegendDot color="#A78BFA" label={t({ tr: 'Lisans', en: 'License' })} />
        <span className="ml-auto italic">{t({ tr: 'Kesikli çizgi: bağımlılık gösterir', en: 'Animated line: dependency' })}</span>
      </div>
      <div style={{ height: 620 }} className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--panel-2)]">
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
          <Background color="var(--border)" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
