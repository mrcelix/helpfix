/** Her deploy'da GitHub Actions (.github/workflows/deploy.yml) tarafından
 * VITE_BUILD_SHA ve VITE_BUILD_TIME ortam değişkenleri olarak enjekte
 * edilir — Vite, VITE_ önekli tüm env değişkenlerini otomatik olarak
 * import.meta.env üzerinden build'e gömer. Yerel geliştirmede (bu
 * değişkenler yokken) "dev" olarak düşer. */
export const BUILD_SHA: string = import.meta.env.VITE_BUILD_SHA || 'dev'
export const BUILD_TIME: string = import.meta.env.VITE_BUILD_TIME || ''
export const BUILD_SHORT_SHA: string = BUILD_SHA === 'dev' ? 'dev' : BUILD_SHA.slice(0, 7)
