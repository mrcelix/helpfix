import { useEffect, useState } from 'react'

const STORAGE_KEY = 'helpfix-sidebar-collapsed'

/** Sidebar'ın daraltılmış/genişletilmiş durumunu tarayıcı oturumları
 * arasında hatırlar (localStorage). Sadece masaüstü (lg+) sidebar'ı
 * için kullanılır — mobilde zaten drawer/alt gezinme var. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  return [collapsed, setCollapsed] as const
}
