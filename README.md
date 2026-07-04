# HelpFix — ITSM Platformu

Multi-tenant, ITIL 4 uyumlu servis yönetimi platformu. Bu kod tabanı, önceden tasarlanan 37 dosyalık mockup setinin gerçek koda dökülmüş halidir — **Faz A/B/C** (proje iskeleti, veritabanı şeması, kimlik doğrulama + uygulama kabuğu) tamamlanmıştır.

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Stil:** Tailwind CSS v4 (CSS-first `@theme` yapılandırması, mockup'lardaki tasarım token'larıyla birebir)
- **Routing:** React Router v7
- **Backend:** Supabase (Postgres + Row Level Security + Auth)
- **İkonlar:** lucide-react

## Kurulum

```bash
npm install
cp .env.example .env
# .env dosyasını kendi Supabase proje bilgilerinizle doldurun:
#   VITE_SUPABASE_URL=https://xxxx.supabase.co
#   VITE_SUPABASE_ANON_KEY=xxxx

# Veritabanı şemasını uygulayın (Supabase CLI kuruluysa):
supabase db push
# ...veya supabase/migrations/0001_init.sql içeriğini doğrudan
# Supabase Dashboard → SQL Editor'e yapıştırıp çalıştırın.

npm run dev
```

## Klasör Yapısı

```
src/
  components/
    layout/       AppShell, Sidebar, Topbar, nav-modules.ts (kanonik 12 modül listesi)
    ui/           Badge, Button gibi paylaşılan bileşenler
    ProtectedRoute.tsx
  contexts/       Auth, Theme (koyu/açık), Lang (TR/EN)
  lib/
    supabase.ts   Supabase istemcisi
    utils.ts      cn() sınıf birleştirici
  pages/
    Login.tsx
    ComingSoon.tsx   Henüz kodlanmamış modüller için yer tutucu
  types/
    database.ts   Supabase tablo tipleri (elle yazıldı, modül eklenince genişletilecek)

supabase/
  migrations/
    0001_init.sql   Çekirdek şema: tenants, user_profiles, departments, incidents + RLS
```

## Tasarım Sistemi

Tüm renkler `src/index.css` içindeki `@theme` bloğunda tanımlı ve **37 mockup dosyasının tamamıyla birebir aynı** (proje boyunca hiç sapmadığı doğrulanmış hex kodları):

| Token | Değer | Kullanım |
|---|---|---|
| `--color-brand` | `#17B0A7` | Ana marka rengi (teal) |
| `--color-p1` / `p2` / `p3` / `p4` | kırmızı/turuncu/mavi/gri | Öncelik seviyeleri |
| `--color-ok` | `#22C55E` | Başarı/çözüldü durumları |
| `--color-purple` | `#A78BFA` | AI/otomasyon özellikleri |

Koyu/açık tema `<html data-theme="dark|light">` üzerinden çalışır (`ThemeContext` ile yönetilir) — mockup'lardaki JS deseninin React karşılığı.

## Şu Ana Kadar Yapılanlar (Faz A/B/C)

- ✅ Vite + React + TS + Tailwind v4 iskeleti
- ✅ Supabase istemcisi + auth context (giriş/çıkış, oturum takibi)
- ✅ Çekirdek veritabanı şeması: `tenants`, `user_profiles`, `departments`, `incidents`, `incident_comments`, `incident_timeline` + tenant-izolasyonlu RLS politikaları
- ✅ Uygulama kabuğu: Sidebar (12 modülün tamamı, mockup'taki kanonik sırayla), Topbar (arama, TR/EN, tema, bildirim)
- ✅ Giriş sayfası
- ✅ Routing — her modül için bir route tanımlı; henüz kodlanmamış modüller "Yakında" sayfası gösteriyor

## Sıradaki Adım (Faz D+)

Modülleri tek tek gerçek Supabase sorgularıyla bağlama. Öncelik sırası kullanıcı tarafından belirlenecek — Servis Masası mantıklı bir ilk aday çünkü diğer modüllerin çoğu ona bağlanıyor (Problem, Değişiklik, CMDB, Bilgi Yönetimi ile çapraz bağlantılı).

Yeni bir modül eklerken izlenecek desen:
1. `supabase/migrations/000X_<modul>.sql` — tablo(lar) + RLS
2. `src/types/database.ts` — tip tanımları ekle
3. `src/pages/<modul>/` — liste/detay/form bileşenleri
4. `src/App.tsx` — `ComingSoonPage` yerine gerçek route bileşenini bağla

## GitHub'a Aktarma & Hostinger'a Otomatik Deploy

Bu proje **statik bir SPA** üretir (`npm run build` sonucu sadece HTML/CSS/JS dosyaları çıkar). Supabase bulutta ayrı çalıştığı için **Hostinger'da Node.js sunucusu gerekmez** — paylaşımlı hosting planı bile yeterlidir.

### 1. GitHub'a push edin

```bash
cd helpfix
git init
git add .
git commit -m "İlk commit: proje iskeleti + Faz A/B/C"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/helpfix.git
git push -u origin main
```

### 2. GitHub Secrets ekleyin

Repo → **Settings → Secrets and variables → Actions → New repository secret** yolundan şu 4 secret'ı ekleyin:

| Secret adı | Nereden alınır |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `HOSTINGER_FTP_SERVER` | hPanel → Dosyalar → FTP Hesapları (genelde `ftp.siteniz.com`) |
| `HOSTINGER_FTP_USERNAME` | hPanel → Dosyalar → FTP Hesapları |
| `HOSTINGER_FTP_PASSWORD` | hPanel → Dosyalar → FTP Hesapları |

### 3. Hostinger'da hedef klasörü doğrulayın

`.github/workflows/deploy.yml` içindeki `server-dir` değeri varsayılan olarak `./public_html/`. Alt alan adı kullanıyorsanız (örn. `helpfix.siteniz.com`) hPanel'de o alt alan adının kök klasörünü kontrol edip buna göre güncelleyin.

### 4. Push edin, otomatik deploy başlasın

Yukarıdaki secret'lar eklendikten sonra `main`'e her push, `.github/workflows/deploy.yml` sayesinde otomatik olarak build alıp Hostinger'a yükler. İlerlemeyi repo'nun **Actions** sekmesinden canlı izleyebilirsiniz.

### 5. SPA yönlendirme sorunu (önemli)

`public/.htaccess` dosyası zaten ekli — bu, kullanıcı `/service-desk` gibi bir adrese direkt girdiğinde veya sayfayı yenilediğinde 404 almasını önler (React Router'ın istemci taraflı yönlendirmesi için gerekli). Build'e otomatik dahil olur, elle bir şey yapmanız gerekmez.

### Alan adı & SSL

Alan adınızı Hostinger'da bu klasöre bağladıktan sonra hPanel'den ücretsiz SSL sertifikasını (Let's Encrypt) tek tıkla etkinleştirebilirsiniz — bu adım tamamen Hostinger tarafında, koda dokunmaz.

