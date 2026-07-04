export function ConfigMissingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0E15] text-[#F4F6F9] px-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-lg font-bold mb-2">Supabase yapılandırması eksik</h1>
        <p className="text-sm text-[#A7B0C0] leading-relaxed mb-4">
          <code className="bg-[#1B2436] px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> ve{' '}
          <code className="bg-[#1B2436] px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> ortam
          değişkenleri build sırasında bulunamadı.
        </p>
        <p className="text-xs text-[#69738A] leading-relaxed">
          GitHub → Settings → Secrets and variables → Actions kısmından bu iki secret&apos;ı
          ekleyip (Supabase Dashboard → Project Settings → API&apos;den alınır) tekrar bir commit
          push edin — deploy otomatik yeniden çalışacaktır.
        </p>
      </div>
    </div>
  )
}
