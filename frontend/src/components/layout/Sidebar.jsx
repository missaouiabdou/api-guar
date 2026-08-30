import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderGit2, GitFork, Webhook, CalendarClock,
  Rocket, GitBranch, Shield, Bell, ScrollText, Settings, ChevronRight
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',         icon: FolderGit2,      label: 'Projects' },
  { to: '/repositories',     icon: GitFork,         label: 'Repositories' },
  { to: '/scans',            icon: GitBranch,       label: 'Scans' },
  { to: '/webhooks',         icon: Webhook,         label: 'Webhooks' },
  { to: '/events',           icon: CalendarClock,   label: 'Events' },
  { to: '/deployments',      icon: Rocket,          label: 'Deployments' },
  { to: '/pipelines',        icon: GitBranch,       label: 'Pipelines' },
  { to: '/security',         icon: Shield,          label: 'Security' },
  { to: '/vulnerabilities',  icon: Bell,            label: 'Alerts', badge: 4 },
  { to: '/audit',            icon: ScrollText,      label: 'Audit Logs' },
  { to: '/settings',         icon: Settings,        label: 'Settings' }
]

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-dark-800 border-r border-dark-700 flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-dark-700">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-base tracking-tight">GuardRail</span>
        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">BETA</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-dark-700 px-3 py-3">
        {(() => {
          let user = { email: 'sarah.chen@acme.com', name: 'Sarah Chen' }
          try {
            const stored = localStorage.getItem('guardrail_user')
            if (stored) {
              const parsed = JSON.parse(stored)
              user = {
                email: parsed.email,
                name: parsed.email.split('@')[0].replace('.', ' ')
              }
            }
          } catch (e) {}

          const initials = user.name
            .split(' ')
            .map(n => n[0]?.toUpperCase())
            .join('')
            .slice(0, 2) || 'SC'

          return (
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-dark-700 transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase">
                {initials}
              </div>
              <div className="flex-1 text-left truncate">
                <div className="text-sm font-medium capitalize truncate text-white">{user.name}</div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            </button>
          )
        })()}
      </div>
    </aside>
  )
}
