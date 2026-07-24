# HelpFix — ITSM Platformu

Multi-tenant, ITIL 4 uyumlu servis yönetimi platformu. Bu kod tabanı, önceden tasarlanan 37 dosyalık mockup setinin gerçek koda dökülmüş halidir. Servis Masası, Problem, Değişiklik, Katalog, CMDB, Bilgi Yönetimi, SLA, Projeler, Raporlama, İzleme, On-Call, AI Otomasyon, Satın Alma ve Mağaza Performansı dahil **14 modülün tamamı** gerçek Supabase sorgularıyla bağlı ve admin panelinden yönetilebiliyor.

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
    layout/       AppShell, Sidebar, Topbar, nav-modules.ts (kanonik 14 modül listesi)
    ui/           Badge, Button gibi paylaşılan bileşenler
    ProtectedRoute.tsx
  contexts/       Auth, Theme (koyu/açık), Lang (TR/EN)
  lib/
    supabase.ts   Supabase istemcisi
    utils.ts      cn() sınıf birleştirici
  pages/
    Login.tsx
    ComingSoon.tsx   Savunma amaçlı yer tutucu — tüm 14 modül gerçek sayfalara bağlı olduğu için artık fiilen tetiklenmiyor
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

## Mevcut Durum

- ✅ Vite + React + TS + Tailwind v4 iskeleti
- ✅ Supabase istemcisi + auth context (giriş/çıkış, oturum takibi)
- ✅ 70+ migration'dan oluşan veritabanı şeması: çekirdek tablolar (`tenants`, `user_profiles`, `departments`, `incidents`, ...) ve her modülün kendi tabloları, tamamı tenant-izolasyonlu RLS politikalarıyla
- ✅ Uygulama kabuğu: Sidebar (14 modülün tamamı, mockup'taki kanonik sırayla), Topbar (arama, TR/EN, tema, bildirim)
- ✅ Giriş sayfası, admin panel (kullanıcı/site/menü/widget/e-posta yönetimi)
- ✅ Routing — 14 modülün tamamı gerçek sayfa bileşenlerine bağlı ve gerçek Supabase sorgularıyla çalışıyor
- ✅ Vitest ile birim testleri + CI'da lint/test kapısı (bkz. "Test ve Kalite Kontrolü")

Yeni bir modül eklerken izlenen desen (referans için):
1. `supabase/migrations/00XX_<modul>.sql` — tablo(lar) + RLS
2. `src/types/database.ts` — tip tanımları ekle
3. `src/pages/<modul>/` — liste/detay/form bileşenleri
4. `src/App.tsx` — gerçek route bileşenini bağla

## Test ve Kalite Kontrolü

```bash
npm run lint   # oxlint — statik analiz
npm run test   # vitest — birim testleri (saf fonksiyonlar: format, priority, isFieldVisible, cn, ...)
```

`.github/workflows/deploy.yml`, `main`'e her push'ta build almadan önce `npm run lint` ve `npm run test`'i çalıştırır — biri başarısız olursa deploy adımına geçilmez. Yeni saf fonksiyon/hook eklerken yanına `*.test.ts` dosyası eklemek bu kalite kapısını güçlü tutar; React bileşenlerinin uçtan uca testi kapsam dışıdır (bkz. Kurulum sonrası tarayıcıda manuel doğrulama).

## Operasyonel Notlar (Zamanlanmış Görevler)

**`capture_store_score_snapshots(p_tenant_id)`** (0051, Mağaza Performansı) — Mağaza Performansı > Geçmiş sekmesindeki "Günlük" periyot görünümü (`get_store_score_trend`, `p_period='day'`) bu fonksiyonun HER GÜN çalıştığını varsayar. `0071_store_score_snapshot_cron.sql` migration'ı `pg_cron` uzantısını etkinleştirip bu fonksiyonu her tenant için her gün 01:00 UTC'de otomatik çalıştıran bir zamanlama ekler — bu migration uygulandıktan sonra elle bir şey yapmanız gerekmez. Mağaza Performansı sayfasındaki **"Anlık Görüntü Al"** butonu, cron'u beklemeden anlık bir snapshot almak isteyenler için hâlâ kullanılabilir.

`pg_cron` uzantısını desteklemeyen bir Postgres ortamında (örn. bazı self-hosted kurulumlar) migration bu adımda başarısız olur; bu durumda `0071` dosyasındaki `create extension` ve `cron.schedule` satırlarını atlayıp otomasyonu harici bir zamanlayıcıyla (örn. GitHub Actions cron tetikleyicisi + Supabase RPC çağrısı) kurmanız gerekir.

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
| `HOSTINGER_FTP_SERVER` | hPanel → Dosyalar → FTP Hesapları (genelde `ftp.helpfix.io`) |
| `HOSTINGER_FTP_USERNAME` | hPanel → Dosyalar → FTP Hesapları |
| `HOSTINGER_FTP_PASSWORD` | hPanel → Dosyalar → FTP Hesapları |

### 3. Hostinger'da hedef klasörü doğrulayın

`.github/workflows/deploy.yml` içindeki `server-dir` değeri varsayılan olarak `./public_html/`. Alt alan adı kullanıyorsanız (örn. `itsm.helpfix.io`) hPanel'de o alt alan adının kök klasörünü kontrol edip buna göre güncelleyin.

### 4. Push edin, otomatik deploy başlasın

Yukarıdaki secret'lar eklendikten sonra `main`'e her push, `.github/workflows/deploy.yml` sayesinde otomatik olarak build alıp Hostinger'a yükler. İlerlemeyi repo'nun **Actions** sekmesinden canlı izleyebilirsiniz.

### 5. SPA yönlendirme sorunu (önemli)

`public/.htaccess` dosyası zaten ekli — bu, kullanıcı `/service-desk` gibi bir adrese direkt girdiğinde veya sayfayı yenilediğinde 404 almasını önler (React Router'ın istemci taraflı yönlendirmesi için gerekli). Build'e otomatik dahil olur, elle bir şey yapmanız gerekmez.

### Alan adı & SSL

Alan adınızı Hostinger'da bu klasöre bağladıktan sonra hPanel'den ücretsiz SSL sertifikasını (Let's Encrypt) tek tıkla etkinleştirebilirsiniz — bu adım tamamen Hostinger tarafında, koda dokunmaz.

