'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { useTransition } from 'react'

export function AdminSearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const q = searchParams.get('q') ?? ''

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="relative w-72">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        defaultValue={q}
        onChange={handleChange}
        placeholder="İsim veya pozisyon ara..."
        className="w-full pl-9 pr-4 py-1.5 bg-slate-50 rounded-full text-[13px] border-none focus:outline-none focus:ring-1 focus:ring-[#0033ff]/20 placeholder:text-slate-400"
      />
    </div>
  )
}
