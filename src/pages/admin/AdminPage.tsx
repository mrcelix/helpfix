import { useState } from 'react'
import { Plus, Pencil, KeyRound, Trash2, Star } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { NAV_MODULES } from '@/components/layout/nav-modules'
import { AdminCatalogTab } from './AdminCatalogTab'
import { AiUsageTab } from './AiUsageTab'
import { EmailSettingsTab } from './EmailSettingsTab'
import { TicketFieldsTab } from './TicketFieldsTab'
import { NewUserModal } from './NewUserModal'
import { EditUserModal } from './EditUserModal'
import { ResetPasswordModal } from './ResetPasswordModal'
import { UserSkillsModal } from './UserSkillsModal'
import { Button } from '@/components/ui/Button'
import {
  useTenantUsers,
  useUpdateUserRole,
  useToggleUserActive,
  useDeleteUser,
  useDepartments,
  useCreateDepartment,
  useFeatureFlags,
  useToggleModule,
  useAuditLog,
  type TenantUser,
} from './useAdmin'
import type { UserRole } from '@/types/database'

const ROLE_OPTIONS: UserRole[] = ['tenant_admin', 'manager', 'agent', 'requester']

export function AdminPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<'users' | 'departments' | 'modules' | 'catalog' | 'audit' | 'ai' | 'email' | 'ticket-fields'>('users')

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

      <div className="flex gap-1 border-b border-[var(--border)] mb-5 overflow-x-auto">
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}>
          {t({ tr: 'Kullanıcılar', en: 'Users' })}
        </TabButton>
        <TabButton active={tab === 'departments'} onClick={() => setTab('departments')}>
          {t({ tr: 'Departmanlar', en: 'Departments' })}
        </TabButton>
        <TabButton active={tab === 'modules'} onClick={() => setTab('modules')}>
          {t({ tr: 'Modüller', en: 'Modules' })}
        </TabButton>
        <TabButton active={tab === 'catalog'} onClick={() => setTab('catalog')}>
          {t({ tr: 'Kataloğ', en: 'Catalog' })}
        </TabButton>
        <TabButton active={tab === 'audit'} onClick={() => setTab('audit')}>
          {t({ tr: 'Denetim Günlüğü', en: 'Audit Log' })}
        </TabButton>
        <TabButton active={tab === 'ai'} onClick={() => setTab('ai')}>
          {t({ tr: 'AI Kullanımı', en: 'AI Usage' })}
        </TabButton>
        <TabButton active={tab === 'email'} onClick={() => setTab('email')}>
          {t({ tr: 'E-posta Ayarları', en: 'Email Settings' })}
        </TabButton>
        <TabButton active={tab === 'ticket-fields'} onClick={() => setTab('ticket-fields')}>
          {t({ tr: 'Talep Alanları', en: 'Ticket Fields' })}
        </TabButton>
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'modules' && <ModulesTab />}
      {tab === 'catalog' && <AdminCatalogTab />}
      {tab === 'audit' && <AuditLogTab />}
      {tab === 'ai' && <AiUsageTab />}
      {tab === 'email' && <EmailSettingsTab />}
      {tab === 'ticket-fields' && <TicketFieldsTab />}
    </div>
  )

  function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className={`shrink-0 whitespace-nowrap px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${active ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
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
  const deleteUser = useDeleteUser()
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)
  const [resettingUser, setResettingUser] = useState<TenantUser | null>(null)
  const [skillsForUser, setSkillsForUser] = useState<TenantUser | null>(null)

  function handleDelete(u: TenantUser) {
    const confirmed = window.confirm(
      t({
        tr: `${u.full_name} kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`,
        en: `Permanently delete ${u.full_name}? This cannot be undone.`,
      })
    )
    if (!confirmed) return
    deleteUser.mutate(u.id)
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setShowNewUserModal(true)}>
          <Plus className="w-[15px] h-[15px]" />
          {t({ tr: 'Yeni Kullanıcı', en: 'New User' })}
        </Button>
      </div>
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
        <table className="w-full text-[12.5px] min-w-[720px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <Th>{t({ tr: 'Ad Soyad', en: 'Name' })}</Th>
              <Th>{t({ tr: 'E-posta', en: 'Email' })}</Th>
              <Th>{t({ tr: 'Departman', en: 'Department' })}</Th>
              <Th>{t({ tr: 'Rol', en: 'Role' })}</Th>
              <Th>{t({ tr: 'Aktif', en: 'Active' })}</Th>
              <Th>{t({ tr: 'Aksiyonlar', en: 'Actions' })}</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={6} className="text-center py-10 text-[var(--text-faint)]">
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
              <td className="px-3.5 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingUser(u)}
                    title={t({ tr: 'Düzenle', en: 'Edit' })}
                    className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-brand-dim hover:bg-[var(--panel-2)]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSkillsForUser(u)}
                    title={t({ tr: 'Beceriler', en: 'Skills' })}
                    className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-p2 hover:bg-[var(--panel-2)]"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setResettingUser(u)}
                    title={t({ tr: 'Şifreyi Yeniden Ata', en: 'Reset Password' })}
                    className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-p2 hover:bg-[var(--panel-2)]"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    title={t({ tr: 'Sil', en: 'Delete' })}
                    className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-p1 hover:bg-[var(--panel-2)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
      {showNewUserModal && <NewUserModal onClose={() => setShowNewUserModal(false)} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />}
      {resettingUser && <ResetPasswordModal user={resettingUser} onClose={() => setResettingUser(null)} />}
      {skillsForUser && <UserSkillsModal user={skillsForUser} onClose={() => setSkillsForUser(null)} />}
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
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
        <table className="w-full text-[12.5px] min-w-[720px]">
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

const ACTION_LABEL: Record<string, { tr: string; en: string }> = {
  role_changed: { tr: 'Rol Değiştirildi', en: 'Role Changed' },
  user_active_toggled: { tr: 'Kullanıcı Durumu Değişti', en: 'User Status Toggled' },
  module_toggled: { tr: 'Modül Aç/Kapa', en: 'Module Toggled' },
}

function AuditLogTab() {
  const { lang, t } = useLang()
  const { data: entries, isLoading } = useAuditLog()

  return (
    <div>
      <p className="text-[12px] text-[var(--text-faint)] mb-4">
        {t({
          tr: 'Güvenlik açısından hassas işlemler (rol değişiklikleri, modül aç/kapa) otomatik olarak buraya kaydedilir.',
          en: 'Security-sensitive actions (role changes, module toggles) are automatically logged here.',
        })}
      </p>
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
        <table className="w-full text-[12.5px] min-w-[720px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <Th>{t({ tr: 'İşlem', en: 'Action' })}</Th>
              <Th>{t({ tr: 'Hedef', en: 'Target' })}</Th>
              <Th>{t({ tr: 'Kim', en: 'Actor' })}</Th>
              <Th>{t({ tr: 'Zaman', en: 'Time' })}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</td></tr>
            )}
            {!isLoading && entries?.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Henüz kayıt yok.', en: 'No entries yet.' })}</td></tr>
            )}
            {entries?.map((e) => (
              <tr key={e.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3.5 py-3 font-semibold">{ACTION_LABEL[e.action]?.[lang] ?? e.action}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{e.target_label ?? '—'}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{e.actor?.full_name ?? '—'}</td>
                <td className="px-3.5 py-3 text-[var(--text-faint)]">{new Date(e.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
