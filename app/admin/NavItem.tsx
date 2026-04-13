'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] tracking-tight transition-all duration-150 cursor-pointer ${
        isActive
          ? 'bg-[#e0e7ff] text-[#0033ff] font-semibold'
          : 'text-slate-600 hover:bg-slate-50 font-medium'
      }`}
    >
      <span className={isActive ? 'text-[#0033ff]' : 'text-slate-400'}>
        {icon}
      </span>
      {label}
    </Link>
  )
}
