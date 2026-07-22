import { useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  KeyRound,
  Trash2,
  Star,
  LayoutDashboard,
  Users as UsersIcon,
  Building2,
  ToggleLeft,
  Package,
  ScrollText,
  Sparkles,
  Mail,
  ListChecks,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  LayoutPanelTop,
  type LucideIcon,
} from 'lucide-react'
import { useLang, pickLang, type Lang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { NAV_MODULES, ICON_MAP } from '@/components/layout/nav-modules'
import { AdminCatalogTab } from './AdminCatalogTab'
import { AiUsageTab } from './AiUsageTab'
import { EmailSettingsTab } from './EmailSettingsTab'
import { TicketFieldsTab } from './TicketFieldsTab'
import { SitesTab } from './SitesTab'
import { DashboardLayoutTab } from './DashboardLayoutTab'
import { OverviewTab } from './OverviewTab'
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
  useToggleModule,
  useNavConfig,
  useUpdateNavConfig,
  useAuditLog,
  ROLE_LABEL,
  type TenantUser,
} from './useAdmin'
import type { UserRole } from '@/types/database'

const ROLE_OPTIONS: UserRole[] = ['tenant_admin', 'manager', 'agent', 'requester']

type AdminTab = 'overview' | 'users' | 'departments' | 'modules' | 'dashboard-layout' | 'catalog' | 'audit' | 'ai' | 'email' | 'ticket-fields' | 'sites'

const ADMIN_TABS: { key: AdminTab; label: { tr: string; en: string }; icon: LucideIcon }[] = [
  { key: 'overview', label: { tr: 'Genel Bakış', en: 'Overview' }, icon: LayoutDashboard },
  { key: 'users', label: { tr: 'Kullanıcılar', en: 'Users' }, icon: UsersIcon },
  { key: 'departments', label: { tr: 'Departmanlar', en: 'Departments' }, icon: Building2 },
  { key: 'modules', label: { tr: 'Modüller', en: 'Modules' }, icon: ToggleLeft },
  { key: 'dashboard-layout', label: { tr: 'Ekran Düzeni', en: 'Screen Layout' }, icon: LayoutPanelTop },
  { key: 'catalog', label: { tr: 'Katalog', en: 'Catalog' }, icon: Package },
  { key: 'audit', label: { tr: 'Denetim Günlüğü', en: 'Audit Log' }, icon: ScrollText },
  { key: 'ai', label: { tr: 'AI Kullanımı', en: 'AI Usage' }, icon: Sparkles },
  { key: 'email', label: { tr: 'E-posta Ayarları', en: 'Email Settings' }, icon: Mail },
  { key: 'ticket-fields', label: { tr: 'Talep Alanları', en: 'Ticket Fields' }, icon: ListChecks },
  { key: 'sites', label: { tr: 'Siteler', en: 'Sites' }, icon: Store },
]

const MENU_COLLAPSED_KEY = 'helpfix-admin-menu-collapsed'

export function AdminPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<AdminTab>('overview')
  // Masaüstünde (lg+) yatay sekme çubuğu yerine daraltılabilir yan menü —
  // durumu localStorage'da hatırlar (Sidebar.tsx'teki desenle aynı mantık).
  // Mobilde eski yatay kaydırılabilir çubuk aynen korunur.
  const [menuCollapsed, setMenuCollapsed] = useState(() => window.localStorage.getItem(MENU_COLLAPSED_KEY) === '1')

  useEffect(() => {
    window.localStorage.setItem(MENU_COLLAPSED_KEY, menuCollapsed ? '1' : '0')
  }, [menuCollapsed])

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Yönetim Paneli', en: 'Admin Panel' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Kullanıcılar, departmanlar ve modül yönetimi', en: 'Users, departments, and module management' })}
          </p>
        </div>
        <button
          onClick={() => setMenuCollapsed((c) => !c)}
          title={menuCollapsed ? t({ tr: 'Menüyü Genişlet', en: 'Expand Menu' }) : t({ tr: 'Menüyü Daralt', en: 'Collapse Menu' })}
          className="hidden lg:flex w-8 h-8 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--panel)] items-center justify-center text-[var(--text-faint)] hover:text-brand-dim hover:border-brand/40"
        >
          {menuCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobil (< lg): eski yatay kaydırılabilir sekme çubuğu, değişmedi */}
      <div className="flex lg:hidden gap-1 border-b border-[var(--border)] mb-5 overflow-x-auto">
        {ADMIN_TABS.map((item) => (
          <TabButton key={item.key} active={tab === item.key} onClick={() => setTab(item.key)}>
            {t(item.label)}
          </TabButton>
        ))}
      </div>

      <div className="flex gap-5 items-start">
        {/* Masaüstü (lg+): daraltılabilir yan (slide) menü */}
        <aside
          className={`hidden lg:flex flex-col gap-0.5 shrink-0 border-r border-[var(--border)] pr-3 transition-[width] duration-200 ${
            menuCollapsed ? 'w-[52px]' : 'w-[196px]'
          }`}
        >
          {ADMIN_TABS.map((item) => {
            const Icon = item.icon
            const active = tab === item.key
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                title={menuCollapsed ? t(item.label) : undefined}
                className={`flex items-center gap-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  menuCollapsed ? 'justify-center px-2' : 'px-2.5'
                } ${active ? 'bg-brand text-white font-semibold' : 'text-[var(--text-sub)] hover:bg-[var(--row-hover)] hover:text-[var(--text)]'}`}
              >
                <Icon className="w-[16px] h-[16px] shrink-0" />
                {!menuCollapsed && <span className="truncate">{t(item.label)}</span>}
              </button>
            )
          })}
        </aside>

        <div className="flex-1 min-w-0">
          {tab === 'overview' && <OverviewTab onNavigateTab={(t) => setTab(t as AdminTab)} />}
          {tab === 'users' && <UsersTab />}
          {tab === 'departments' && <DepartmentsTab />}
          {tab === 'modules' && <ModulesTab />}
          {tab === 'dashboard-layout' && <DashboardLayoutTab />}
          {tab === 'catalog' && <AdminCatalogTab />}
          {tab === 'audit' && <AuditLogTab />}
          {tab === 'ai' && <AiUsageTab />}
          {tab === 'email' && <EmailSettingsTab />}
          {tab === 'ticket-fields' && <TicketFieldsTab />}
          {tab === 'sites' && <SitesTab />}
        </div>
      </div>
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

function UsersTab() {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const { data: users, isLoading, error } = useTenantUsers()
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
          {error && (
            <tr>
              <td colSpan={6} className="text-center py-10 text-p1">
                {t({ tr: 'Kullanıcılar yüklenemedi.', en: 'Failed to load users.' })}
              </td>
            </tr>
          )}
          {users?.map((u) => {
            const isSelf = u.id === profile?.id
            return (
            <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
              <td className="px-3.5 py-3 font-semibold">
                {u.full_name}
                {isSelf && <span className="ml-1.5 text-[9px] font-bold text-[var(--text-faint)]">({t({ tr: 'siz', en: 'you' })})</span>}
              </td>
              <td className="px-3.5 py-3 text-[var(--text-sub)]">{u.email}</td>
              <td className="px-3.5 py-3 text-[var(--text-sub)]">{u.department?.name ?? '—'}</td>
              <td className="px-3.5 py-3">
                <select
                  value={u.role}
                  onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value as UserRole })}
                  disabled={isSelf}
                  title={isSelf ? t({ tr: 'Kendi rolünüzü değiştiremezsiniz', en: "You can't change your own role" }) : undefined}
                  className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11.5px] disabled:opacity-50"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {pickLang(ROLE_LABEL[r], lang)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3.5 py-3">
                <button
                  onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                  disabled={isSelf}
                  aria-pressed={u.is_active}
                  title={isSelf ? t({ tr: 'Kendi hesabınızı devre dışı bırakamazsınız', en: "You can't deactivate your own account" }) : undefined}
                  className={`w-9 h-5 rounded-full relative transition-colors disabled:opacity-50 ${u.is_active ? 'bg-ok' : 'bg-[var(--border)]'}`}
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
                    disabled={isSelf}
                    title={isSelf ? t({ tr: 'Kendi hesabınızı silemezsiniz', en: "You can't delete your own account" }) : t({ tr: 'Sil', en: 'Delete' })}
                    className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-p1 hover:bg-[var(--panel-2)] disabled:opacity-30 disabled:hover:text-[var(--text-faint)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
            )
          })}
          </tbody>
        </table>
      </div>
      {showNewUserModal && <NewUserModal onClose={() => setShowNewUserModal(false)} />}
      {editingUser && <EditUserModal key={editingUser.id} user={editingUser} onClose={() => setEditingUser(null)} />}
      {resettingUser && <ResetPasswordModal key={resettingUser.id} user={resettingUser} onClose={() => setResettingUser(null)} />}
      {skillsForUser && <UserSkillsModal key={skillsForUser.id} user={skillsForUser} onClose={() => setSkillsForUser(null)} />}
    </div>
  )
}

function DepartmentsTab() {
  const { t } = useLang()
  const { data: departments, isLoading, error } = useDepartments()
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
        <button
          onClick={add}
          title={t({ tr: 'Departman Ekle', en: 'Add Department' })}
          aria-label={t({ tr: 'Departman Ekle', en: 'Add Department' })}
          className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shrink-0"
        >
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
            {error && (
              <tr>
                <td className="text-center py-10 text-p1">{t({ tr: 'Departmanlar yüklenemedi.', en: 'Failed to load departments.' })}</td>
              </tr>
            )}
            {!isLoading && !error && departments?.length === 0 && (
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

const MIN_ROLE_OPTIONS: { value: UserRole | null; label: { tr: string; en: string } }[] = [
  { value: null, label: { tr: 'Herkes', en: 'Everyone' } },
  { value: 'agent', label: { tr: 'Teknisyen ve üzeri', en: 'Agent and above' } },
  { value: 'manager', label: { tr: 'Yönetici ve üzeri', en: 'Manager and above' } },
  { value: 'tenant_admin', label: { tr: 'Sadece Admin', en: 'Admin only' } },
]

const ICON_CHOICES = Object.keys(ICON_MAP)

function ModulesTab() {
  const { lang, t } = useLang()
  const { data: navConfig, isLoading, error } = useNavConfig()
  const toggleModule = useToggleModule()
  const updateNavConfig = useUpdateNavConfig()
  const [editingCode, setEditingCode] = useState<string | null>(null)

  const sortedModules = [...NAV_MODULES].sort(
    (a, b) => (navConfig?.[a.code]?.order ?? 0) - (navConfig?.[b.code]?.order ?? 0)
  )

  function move(code: string, direction: -1 | 1) {
    const idx = sortedModules.findIndex((m) => m.code === code)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sortedModules.length) return
    const a = sortedModules[idx]
    const b = sortedModules[swapIdx]
    const aOrder = navConfig?.[a.code]?.order ?? idx
    const bOrder = navConfig?.[b.code]?.order ?? swapIdx
    updateNavConfig.mutate({ moduleCode: a.code, order: bOrder })
    updateNavConfig.mutate({ moduleCode: b.code, order: aOrder })
  }

  return (
    <div>
      <p className="text-[12px] text-[var(--text-faint)] mb-4">
        {t({
          tr: 'Bir modülü kapatırsan, tüm tenant kullanıcıları için sol menüden ve doğrudan URL erişiminden kaybolur. Sıra, minimum rol ve özel ad/ikon sadece sol menü görünümünü etkiler — sayfaya erişimi kısıtlamaz.',
          en: "Disabling a module hides it from the sidebar and blocks direct URL access for all tenant users. Order, minimum role, and custom name/icon only affect the sidebar display — they don't restrict page access.",
        })}
      </p>
      {isLoading ? (
        <p className="text-[var(--text-faint)] text-sm py-8 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
      ) : error ? (
        <p className="text-p1 text-sm py-8 text-center">{t({ tr: 'Modül ayarları yüklenemedi.', en: 'Failed to load module settings.' })}</p>
      ) : (
        <div className="space-y-2">
          {sortedModules.map((m, idx) => {
            const cfg = navConfig?.[m.code]
            const Icon = (cfg?.customIcon && ICON_MAP[cfg.customIcon]) || m.icon
            const enabled = cfg?.isEnabled ?? true
            const isEditing = editingCode === m.code
            return (
              <div key={m.code} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex flex-col shrink-0 -my-1">
                    <button
                      onClick={() => move(m.code, -1)}
                      disabled={idx === 0}
                      title={t({ tr: 'Yukarı taşı', en: 'Move up' })}
                      aria-label={t({ tr: 'Yukarı taşı', en: 'Move up' })}
                      className="text-[var(--text-faint)] hover:text-brand-dim disabled:opacity-20"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => move(m.code, 1)}
                      disabled={idx === sortedModules.length - 1}
                      title={t({ tr: 'Aşağı taşı', en: 'Move down' })}
                      aria-label={t({ tr: 'Aşağı taşı', en: 'Move down' })}
                      className="text-[var(--text-faint)] hover:text-brand-dim disabled:opacity-20"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Icon className="w-[17px] h-[17px] text-[var(--text-sub)] shrink-0" />
                  <span className="font-semibold text-[13px] flex-1 truncate">
                    {cfg?.customName?.[lang] || pickLang(m.name, lang)}
                  </span>
                  {cfg?.minRole && (
                    <span className="text-[9px] font-bold bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text-faint)] rounded-full px-1.5 py-0.5 shrink-0">
                      {pickLang(ROLE_LABEL[cfg.minRole], lang)}+
                    </span>
                  )}
                  {m.badge === 'beta' && (
                    <span className="text-[9px] font-mono font-bold bg-purple-tint text-purple rounded-full px-1.5 py-0.5 shrink-0">BETA</span>
                  )}
                  <button
                    onClick={() => setEditingCode(isEditing ? null : m.code)}
                    title={t({ tr: 'Düzenle', en: 'Edit' })}
                    aria-label={t({ tr: 'Düzenle', en: 'Edit' })}
                    aria-pressed={isEditing}
                    className={`p-1.5 rounded-md shrink-0 hover:bg-[var(--panel-2)] ${isEditing ? 'text-brand-dim' : 'text-[var(--text-faint)]'}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleModule.mutate({ moduleCode: m.code, isEnabled: !enabled })}
                    aria-pressed={enabled}
                    title={enabled ? t({ tr: 'Aktif — devre dışı bırak', en: 'Active — disable' }) : t({ tr: 'Pasif — etkinleştir', en: 'Inactive — enable' })}
                    aria-label={enabled ? t({ tr: 'Aktif — devre dışı bırak', en: 'Active — disable' }) : t({ tr: 'Pasif — etkinleştir', en: 'Inactive — enable' })}
                    className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${enabled ? 'bg-ok' : 'bg-[var(--border)]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {isEditing && (
                  <ModuleEditPanel
                    module={m}
                    config={cfg}
                    onUpdate={(patch) => updateNavConfig.mutate({ moduleCode: m.code, ...patch })}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ModuleEditPanel({
  module: m,
  config,
  onUpdate,
}: {
  module: (typeof NAV_MODULES)[number]
  config?: { minRole: UserRole | null; customName: Partial<Record<Lang, string>> | null; customIcon: string | null }
  onUpdate: (patch: { minRole?: UserRole | null; customName?: Partial<Record<Lang, string>> | null; customIcon?: string | null }) => void
}) {
  const { t } = useLang()
  const [nameTr, setNameTr] = useState(config?.customName?.tr ?? '')
  const [nameEn, setNameEn] = useState(config?.customName?.en ?? '')

  function saveName() {
    const trimmedTr = nameTr.trim()
    const trimmedEn = nameEn.trim()
    onUpdate({ customName: trimmedTr || trimmedEn ? { tr: trimmedTr || undefined, en: trimmedEn || undefined } : null })
  }

  return (
    <div className="border-t border-[var(--border)] px-4 py-3.5 bg-[var(--panel-2)] space-y-3">
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1">
          {t({ tr: 'Minimum Rol', en: 'Minimum Role' })}
        </label>
        <select
          value={config?.minRole ?? ''}
          onChange={(e) => onUpdate({ minRole: (e.target.value || null) as UserRole | null })}
          className="w-full max-w-xs bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
        >
          {MIN_ROLE_OPTIONS.map((o) => (
            <option key={o.value ?? 'all'} value={o.value ?? ''}>
              {t(o.label)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-md">
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1">
            {t({ tr: 'Özel Ad (TR)', en: 'Custom Name (TR)' })}
          </label>
          <input
            value={nameTr}
            onChange={(e) => setNameTr(e.target.value)}
            onBlur={saveName}
            placeholder={m.name.tr}
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1">
            {t({ tr: 'Özel Ad (EN)', en: 'Custom Name (EN)' })}
          </label>
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            onBlur={saveName}
            placeholder={m.name.en}
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
          {t({ tr: 'İkon', en: 'Icon' })}
        </label>
        <div className="flex flex-wrap gap-1.5 max-w-md">
          {ICON_CHOICES.map((name) => {
            const IconOption = ICON_MAP[name]
            const active = (config?.customIcon ?? null) === name
            return (
              <button
                key={name}
                onClick={() => onUpdate({ customIcon: active ? null : name })}
                title={name}
                aria-pressed={active}
                className={`w-8 h-8 rounded-md flex items-center justify-center border ${
                  active ? 'bg-brand border-brand text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-faint)] hover:text-brand-dim'
                }`}
              >
                <IconOption className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      </div>
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
  const { data: entries, isLoading, error } = useAuditLog()

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
            {error && (
              <tr><td colSpan={4} className="text-center py-10 text-p1">{t({ tr: 'Denetim günlüğü yüklenemedi.', en: 'Failed to load audit log.' })}</td></tr>
            )}
            {!isLoading && !error && entries?.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Henüz kayıt yok.', en: 'No entries yet.' })}</td></tr>
            )}
            {entries?.map((e) => (
              <tr key={e.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3.5 py-3 font-semibold">{(ACTION_LABEL[e.action] ? pickLang(ACTION_LABEL[e.action], lang) : undefined) ?? e.action}</td>
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
