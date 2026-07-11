import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useCreateUser, useDepartments, generateTempPassword } from './useAdmin'
import type { UserRole } from '@/types/database'

const ROLE_LABEL: Record<UserRole, { tr: string; en: string }> = {
  tenant_admin: { tr: 'Tenant Admin', en: 'Tenant Admin' },
  manager: { tr: 'Ekip Yöneticisi', en: 'Team Manager' },
  agent: { tr: 'Teknisyen', en: 'Agent' },
  requester: { tr: 'Son Kullanıcı', en: 'Requester' },
}

export function NewUserModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const createUser = useCreateUser()
  const { data: departments } = useDepartments()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('requester')
  const [departmentId, setDepartmentId] = useState('')
  const [password, setPassword] = useState(generateTempPassword())
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !fullName.trim()) return
    setError(null)
    try {
      await createUser.mutateAsync({ email: email.trim(), password, fullName: fullName.trim(), role, departmentId: departmentId || null })
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t({ tr: 'Bilinmeyen hata', en: 'Unknown error' }))
    }
  }

  function copyPassword() {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (done) {
    return (
      <Modal open onClose={onClose} title={t({ tr: 'Kullanıcı Oluşturuldu', en: 'User Created' })}>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-ok flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-white" />
          </div>
          <p className="text-[13px] text-[var(--text-sub)] mb-4">
            {t({ tr: 'Bu geçici şifreyi kullanıcıyla güvenli bir şekilde paylaşın:', en: 'Share this temporary password with the user securely:' })}
          </p>
          <div className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 mb-4">
            <code className="flex-1 text-[13px] font-mono text-left">{password}</code>
            <button onClick={copyPassword} className="text-brand-dim">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-faint)] mb-4">
            {t({ tr: 'Kullanıcı ilk girişte şifresini değiştirmelidir.', en: 'The user should change this password on first login.' })}
          </p>
          <Button onClick={onClose}>{t({ tr: 'Tamam', en: 'Done' })}</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Kullanıcı', en: 'New User' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createUser.isPending || !email.trim() || !fullName.trim()}>
            {createUser.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Kullanıcı Oluştur', en: 'Create User' })}
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
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Rol', en: 'Role' })}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]"
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
          <label className="flex items-center justify-between text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            <span>{t({ tr: 'Geçici Şifre', en: 'Temporary Password' })}</span>
            <button type="button" onClick={() => setPassword(generateTempPassword())} className="text-brand-dim normal-case font-semibold">
              {t({ tr: 'Yeniden Oluştur', en: 'Regenerate' })}
            </button>
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono"
          />
        </div>
        {error && <p className="text-p1 text-[12px]">{error}</p>}
      </div>
    </Modal>
  )
}
