import { Star } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useUserSkills, useSetUserSkill, useRemoveUserSkill, type TenantUser } from './useAdmin'
import { TICKET_CATEGORIES } from '@/pages/service-desk/ticket-categories'

export function UserSkillsModal({ user, onClose }: { user: TenantUser; onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: skills, isLoading, error } = useUserSkills(user.id)
  const setSkill = useSetUserSkill()
  const removeSkill = useRemoveUserSkill()

  function skillFor(label: string) {
    return skills?.find((s) => s.category_label === label)
  }

  function toggle(label: string) {
    const existing = skillFor(label)
    if (existing) removeSkill.mutate(existing.id)
    else setSkill.mutate({ userId: user.id, categoryLabel: label, proficiency: 3 })
  }

  function setProficiency(label: string, proficiency: number) {
    setSkill.mutate({ userId: user.id, categoryLabel: label, proficiency })
  }

  return (
    <Modal open onClose={onClose} title={t({ tr: `${user.full_name} — Beceriler`, en: `${user.full_name} — Skills` })} footer={<Button onClick={onClose}>{t({ tr: 'Kapat', en: 'Close' })}</Button>}>
      <p className="text-[11.5px] text-[var(--text-faint)] mb-2.5">
        {t({
          tr: 'Bu kullanıcının yetkin olduğu kategorileri işaretleyin. Otomasyon kurallarında "Beceriye Göre Ata" seçildiğinde, eşleşen kategoride en az açık kaydı olan yetkin kişiye otomatik atama yapılır.',
          en: 'Mark the categories this user is proficient in. When an automation rule uses "Assign by Skill", the least-loaded proficient person for the matching category is auto-assigned.',
        })}
      </p>
      <p className="text-[10.5px] text-[var(--text-faint)] italic mb-4">
        {t({
          tr: 'Not: Eşleştirme, talebin oluşturulduğu andaki Türkçe kategori metniyle yapılır — talep başka bir dilde açılırsa otomatik atama bu beceriyle eşleşmeyebilir.',
          en: 'Note: matching uses the Turkish category text at the time the ticket is created — if a ticket is opened in another language, auto-assignment may not match this skill.',
        })}
      </p>
      {isLoading && <p className="text-[12px] text-[var(--text-faint)] text-center py-4">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
      {error && <p className="text-[12px] text-p1 text-center py-4">{t({ tr: 'Beceriler yüklenemedi.', en: 'Failed to load skills.' })}</p>}
      {!isLoading && !error && (
      <div className="flex flex-col gap-2">
        {TICKET_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const skill = skillFor(cat.label.tr)
          const isActive = !!skill
          return (
            <div
              key={cat.key}
              className={
                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ' +
                (isActive ? 'bg-brand-tint border-brand/40' : 'bg-[var(--panel-2)] border-[var(--border)]')
              }
            >
              <button
                type="button"
                onClick={() => toggle(cat.label.tr)}
                aria-pressed={isActive}
                className="flex items-center gap-2.5 flex-1 text-left"
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-dim' : 'text-[var(--text-faint)]'}`} />
                <span className="text-[13px] font-semibold">{pickLang(cat.label, lang)}</span>
              </button>
              {isActive && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setProficiency(cat.label.tr, n)}
                      title={t({ tr: `Yetkinlik: ${n}/5`, en: `Proficiency: ${n}/5` })}
                      aria-label={t({ tr: `Yetkinlik: ${n}/5`, en: `Proficiency: ${n}/5` })}
                    >
                      <Star className={`w-3.5 h-3.5 ${n <= skill.proficiency ? 'fill-p2 text-p2' : 'text-[var(--border)]'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}
    </Modal>
  )
}
