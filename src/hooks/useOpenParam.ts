import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Komut Paleti'nden "?open=<id>" ile gelindiğinde, o id'yi bir kez
 * okur ve URL'i temizler — sayfa bileşeni bunu kendi selectedId
 * state'ine aktarabilir. */
export function useOpenParam(): string | null {
  const [searchParams, setSearchParams] = useSearchParams()
  const [openId] = useState<string | null>(searchParams.get('open'))

  useEffect(() => {
    if (searchParams.get('open')) {
      searchParams.delete('open')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return openId
}
