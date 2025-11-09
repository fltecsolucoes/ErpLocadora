'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HardHat, LayoutDashboard, FileText, ClipboardList, Users, Package, Shield, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/quotes', icon: FileText, label: 'Orçamentos' },
  { href: '/dashboard/orders', icon: ClipboardList, label: 'Ordens de Serviço' },
  { href: '/dashboard/clients', icon: Users, label: 'Clientes' },
  { href: '/dashboard/products', icon: Package, label: 'Inventário' },
  { href: '/dashboard/admin/permissions', icon: Shield, label: 'Admin' },
]

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-shrink-0 bg-background border-r border-border flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <HardHat className="h-8 w-8 text-primary" />
        <span className="ml-3 text-lg font-bold text-foreground">ERP Locação</span>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-secondary">
              <User className="h-5 w-5 text-secondary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground truncate">{userEmail}</span>
          </div>
          <form action="/auth/sign-out" method="post">
             <button type="submit" className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-accent-foreground">
                <LogOut className="h-5 w-5" />
             </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
