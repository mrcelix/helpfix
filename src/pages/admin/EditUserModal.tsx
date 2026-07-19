import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useUpdateUser, useUpdateUserSite, useDepartments, ROLE_LABEL, type TenantUser } from './useAdmin'
import { useSites } from './useSites'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/database'

export function EditUserModal({ user, onClose }: { user: TenantUser; onClose: () => void }) {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const isSelf = user.id === profile?.id
  const updateUser = useUpdateUser()
  const updateUserSite = useUpdateUserSite()
  const { data: departments } = useDepartments()
  const { data: sites } = useSites()

  const [fullName, setFullName] = useState(user.full_name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<UserRole>(user.role)
  const [departmentId, setDepartmentId] = useState(user.department_id ?? '')
  const [siteId, setSiteId] = useState(user.site_id ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!fullName.trim() || !email.trim()) return
    setError(null)
    try {
      await Promise.all([
        updateUser.mutateAsync({
          userId: user.id,
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          departmentId: departmentId || null,
        }),
        siteId !== (user.site_id ?? '') ? updateUserSite.mutateAsync({ userId: user.id, siteId: siteId || null }) : Promise.resolve(),
      ])
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t({ tr: 'Bilinmeyen hata', en: 'Unknown error' }))
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Kullanıcıyı Düzenle', en: 'Edit User' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={updateUser.isPending || !fullName.trim() || !email.trim()}>
            {updateUser.isPending ? t({ tr: 'Kaydediliyor…', en: 'Saving…' }) : t({ tr: 'Kaydet', en: 'Save' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Ad Soyad', en: 'Full Name' })}
          </label>
          <input
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'E-posta', en: 'Email' })}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          />
          <p className="text-[10.5px] text-[var(--text-faint)] mt-1">
            {t({
              tr: 'E-posta değiştirilirse kullanıcı bir sonraki girişte yeni adresi kullanmalıdır.',
              en: 'If email changes, the user must log in with the new address next time.',
            })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Rol', en: 'Role' })}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={isSelf}
              title={isSelf ? t({ tr: 'Kendi rolünüzü değiştiremezsiniz', en: "You can't change your own role" }) : undefined}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px] disabled:opacity-50"
            >
              {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {pickLang(ROLE_LABEL[r], lang)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Departman', en: 'Department' })}
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]"
            >
              <option value="">{t({ tr: 'Yok', en: 'None' })}</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Site', en: 'Site' })}
          </label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]"
          >
            <option value="">{t({ tr: 'Yok', en: 'None' })}</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-p1 text-[12px]">{error}</p>}
      </div>
    </Modal>
  )
}
