import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { LangProvider } from './contexts/LangContext'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider, showGlobalToast } from './contexts/ToastContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
  // Herhangi bir mutation (kaydetme/güncelleme/silme) başarısız olursa
  // kullanıcıya otomatik olarak toast göster — tek tek her mutate
  // çağrısına onError eklemek zorunda kalmadan tutarlı geri bildirim.
  // Bir mutation `meta: { silent: true }` ile bu davranıştan çıkabilir
  // (ör. arka planda sessizce denenen AI önerileri).
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.meta?.silent) return
      const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu'
      showGlobalToast(message, 'error')
    },
  }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>,
)
