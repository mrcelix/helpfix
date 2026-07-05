import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { NAV_MODULES } from '@/components/layout/nav-modules'
import {
  useTenantUsers,
  useUpdateUserRole,
  useToggleUserActive,
  useDepartments,
  useCreateDepartment,
  useFeatureFlags,
  useToggleModule,
} from './useAdmin'
import type { UserRole } from '@/types/database'

const ROLE_OPTIONS: UserRole[] = ['tenant_admin', 'manager', 'agent', 'requester']

export function AdminPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<'users' | 'departments' | 'modules'>('users')

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-bold tracking-tight">
          {t({ tr: 'Yönetim Paneli', en: 'Admin Panel' })}
        </h1>
        <p className="text-[13px] text-[var(--text-faint)] mt-1">
          {t({ tr: 'Kullanıcılar, departmanlar ve modül yönetimi', en: 'Users, departments, and module management' })}
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-5">
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}>
          {t({ tr: 'Kullanıcılar', en: 'Users' })}
        </TabButton>
        <TabButton active={tab === 'departments'} onClick={() => setTab('departments')}>
          {t({ tr: 'Departmanlar', en: 'Departments' })}
        </TabButton>
        <TabButton active={tab === 'modules'} onClick={() => setTab('modules')}>
          {t({ tr: 'Modüller', en: 'Modules' })}
        </TabButton>
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'modules' && <ModulesTab />}
    </div>
  )

  function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${active ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
      >
        {children}
      </button>
    )
  }
}

const ROLE_LABEL: Record<UserRole, { tr: string; en: string }> = {
  tenant_admin: { tr: 'Tenant Admin', en: 'Tenant Admin' },
  manager: { tr: 'Ekip Yöneticisi', en: 'Team Manager' },
  agent: { tr: 'Teknisyen', en: 'Agent' },
  requester: { tr: 'Son Kullanıcı', en: 'Requester' },
}

function UsersTab() {
  const { lang, t } = useLang()
  const { data: users, isLoading } = useTenantUsers()
  const updateRole = useUpdateUserRole()
  const toggleActive = useToggleUserActive()

  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
            <Th>{t({ tr: 'Ad Soyad', en: 'Name' })}</Th>
            <Th>{t({ tr: 'E-posta', en: 'Email' })}</Th>
            <Th>{t({ tr: 'Departman', en: 'Department' })}</Th>
            <Th>{t({ tr: 'Rol', en: 'Role' })}</Th>
            <Th>{t({ tr: 'Aktif', en: 'Active' })}</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={5} className="text-center py-10 text-[var(--text-faint)]">
                {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
              </td>
            </tr>
          )}
          {users?.map((u) => (
            <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
              <td className="px-3.5 py-3 font-semibold">{u.full_name}</td>
              <td className="px-3.5 py-3 text-[var(--text-sub)]">{u.email}</td>
              <td className="px-3.5 py-3 text-[var(--text-sub)]">{u.department?.name ?? '—'}</td>
              <td className="px-3.5 py-3">
                <select
                  value={u.role}
                  onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value as UserRole })}
                  className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11.5px]"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r][lang]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3.5 py-3">
                <button
                  onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                  className={`w-9 h-5 rounded-full relative transition-colors ${u.is_active ? 'bg-ok' : 'bg-[var(--border)]'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${u.is_active ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DepartmentsTab() {
  const { t } = useLang()
  const { data: departments, isLoading } = useDepartments()
  const createDepartment = useCreateDepartment()
  const [newName, setNewName] = useState('')

  function add() {
    if (!newName.trim()) return
    createDepartment.mutate(newName.trim())
    setNewName('')
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 max-w-sm">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t({ tr: 'Yeni departman adı…', en: 'New department name…' })}
          className="flex-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12.5px]"
        />
        <button onClick={add} className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
        <table className="w-full text-[12.5px]">
          <tbody>
            {isLoading && (
              <tr>
                <td className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</td>
              </tr>
            )}
            {!isLoading && departments?.length === 0 && (
              <tr>
                <td className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Henüz departman yok.', en: 'No departments yet.' })}</td>
              </tr>
            )}
            {departments?.map((d) => (
              <tr key={d.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3.5 py-3 font-semibold">{d.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ModulesTab() {
  const { lang, t } = useLang()
  const { data: flags, isLoading } = useFeatureFlags()
  const toggleModule = useToggleModule()

  return (
    <div>
      <p className="text-[12px] text-[var(--text-faint)] mb-4">
        {t({
          tr: 'Bir modülü kapatırsan, tüm tenant kullanıcıları için sol menüden ve doğrudan URL erişiminden kaybolur.',
          en: 'Disabling a module hides it from the sidebar and blocks direct URL access for all tenant users.',
        })}
      </p>
      {isLoading ? (
        <p className="text-[var(--text-faint)] text-sm py-8 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
      ) : (
        <div className="space-y-2">
          {NAV_MODULES.map((m) => {
            const Icon = m.icon
            const enabled = flags?.[m.code] ?? true
            return (
              <div key={m.code} className="flex items-center gap-3 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-4 py-3">
                <Icon className="w-[17px] h-[17px] text-[var(--text-sub)]" />
                <span className="font-semibold text-[13px] flex-1">{m.name[lang]}</span>
                {m.badge === 'beta' && (
                  <span className="text-[9px] font-mono font-bold bg-purple-tint text-purple rounded-full px-1.5 py-0.5">BETA</span>
                )}
                <button
                  onClick={() => toggleModule.mutate({ moduleCode: m.code, isEnabled: !enabled })}
                  className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${enabled ? 'bg-ok' : 'bg-[var(--border)]'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">
      {children}
    </th>
  )
}
