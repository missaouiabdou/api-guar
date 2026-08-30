'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import {
  User, Building2, Bell, Key, Shield, Users, Plug,
  ChevronRight, Eye, EyeOff, Copy, Check, Plus,
  Trash2, Save, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'team', label: 'Team & Access', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Plug },
]

const teamMembers = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@acme.com', role: 'Owner', avatar: 'SC', status: 'active' },
  { id: '2', name: 'Marcus Dev', email: 'marcus.dev@acme.com', role: 'Admin', avatar: 'MD', status: 'active' },
  { id: '3', name: 'Alex Kim', email: 'alex.kim@acme.com', role: 'Member', avatar: 'AK', status: 'active' },
  { id: '4', name: 'Diana Lee', email: 'diana.lee@acme.com', role: 'Member', avatar: 'DL', status: 'active' },
  { id: '5', name: 'Priya Nair', email: 'priya.nair@acme.com', role: 'Member', avatar: 'PN', status: 'active' },
  { id: '6', name: 'Tom Walker', email: 'tom.walker@acme.com', role: 'Viewer', avatar: 'TW', status: 'pending' },
]

const apiKeys = [
  { id: 'k1', name: 'ci-cd-token', prefix: 'gr_live_', createdAt: '2025-06-15', lastUsed: '2 hours ago', scopes: ['read', 'deploy'] },
  { id: 'k2', name: 'monitoring-readonly', prefix: 'gr_live_', createdAt: '2025-07-01', lastUsed: '1 day ago', scopes: ['read'] },
]

const integrations = [
  { id: 'gh', name: 'GitHub', desc: 'Source control and CI integration', connected: true, icon: '⬡' },
  { id: 'slack', name: 'Slack', desc: 'Alert notifications and deployments', connected: true, icon: '◈' },
  { id: 'pagerduty', name: 'PagerDuty', desc: 'On-call incident management', connected: false, icon: '◉' },
  { id: 'datadog', name: 'Datadog', desc: 'Metrics, logs and APM', connected: false, icon: '◆' },
  { id: 'snyk', name: 'Snyk', desc: 'Vulnerability scanning for dependencies', connected: true, icon: '⬟' },
  { id: 'jira', name: 'Jira', desc: 'Issue tracking and project management', connected: false, icon: '◈' },
]

function SectionNav({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav className="space-y-0.5">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
            active === s.id
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <s.icon className="h-4 w-4 flex-shrink-0" />
          {s.label}
          {active === s.id && <ChevronRight className="h-3.5 w-3.5 ml-auto text-primary/60" />}
        </button>
      ))}
    </nav>
  )
}

function ProfileSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Profile</h2>
        <p className="text-xs text-muted-foreground mt-1">Manage your personal information and preferences.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-white">SC</span>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Sarah Chen</p>
          <div className="flex items-center gap-2">
            <button className="text-xs font-medium text-primary hover:underline">Change avatar</button>
            <span className="text-muted-foreground">·</span>
            <button className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'First Name', value: 'Sarah', type: 'text' },
          { label: 'Last Name', value: 'Chen', type: 'text' },
          { label: 'Email Address', value: 'sarah.chen@acme.com', type: 'email' },
          { label: 'Job Title', value: 'Platform Engineering Lead', type: 'text' },
        ].map(({ label, value, type }) => (
          <div key={label} className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <input
              type={type}
              defaultValue={value}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Timezone */}
      <div className="space-y-1.5 max-w-xs">
        <label className="text-xs font-medium text-muted-foreground">Timezone</label>
        <select className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none transition-colors">
          <option>America/New_York (UTC-5)</option>
          <option>America/Los_Angeles (UTC-8)</option>
          <option>Europe/London (UTC+0)</option>
          <option>Asia/Tokyo (UTC+9)</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors">
          <Save className="h-3.5 w-3.5" />
          Save changes
        </button>
        <button className="rounded-lg border border-border bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

function OrganizationSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Organization</h2>
        <p className="text-xs text-muted-foreground mt-1">Manage your organization settings and billing.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Organization Name</label>
          <input
            type="text"
            defaultValue="Acme Corporation"
            className="w-full max-w-xs rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Organization Slug</label>
          <div className="flex items-center max-w-xs">
            <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-accent px-3 py-2 text-xs text-muted-foreground">
              guardrail.io/
            </span>
            <input
              type="text"
              defaultValue="acme-corp"
              className="flex-1 rounded-r-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Team Plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">$49/month · 10 seats included</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Active</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Seats used</span>
            <span className="text-foreground font-medium">6 / 10</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: '60%' }} />
          </div>
        </div>
        <button className="text-xs font-medium text-primary hover:underline">Manage billing</button>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm font-semibold">Danger Zone</p>
        </div>
        <p className="text-xs text-muted-foreground">Once you delete your organization, there is no going back. Please be certain.</p>
        <button className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
          Delete organization
        </button>
      </div>
    </div>
  )
}

function TeamSection() {
  const roleColors: Record<string, string> = {
    Owner: 'text-primary bg-primary/10',
    Admin: 'text-purple-400 bg-purple-500/10',
    Member: 'text-foreground bg-accent',
    Viewer: 'text-muted-foreground bg-muted',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Team & Access</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage who has access to your organization.</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          Invite member
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {teamMembers.map((member, i) => (
          <div
            key={member.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors',
              i !== teamMembers.length - 1 && 'border-b border-border/50'
            )}
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-white">{member.avatar}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                {member.status === 'pending' && (
                  <span className="text-[10px] font-medium text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">Pending</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                defaultValue={member.role}
                className="rounded-lg border border-border bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
              >
                <option>Owner</option>
                <option>Admin</option>
                <option>Member</option>
                <option>Viewer</option>
              </select>
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', roleColors[member.role])}>
                {member.role}
              </span>
              {member.role !== 'Owner' && (
                <button className="text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotificationsSection() {
  const channels = [
    { id: 'email', label: 'Email Notifications' },
    { id: 'slack', label: 'Slack Notifications' },
    { id: 'browser', label: 'Browser Push Notifications' },
  ]
  const events = [
    { id: 'deploy_success', label: 'Deployment succeeded' },
    { id: 'deploy_failed', label: 'Deployment failed' },
    { id: 'pipeline_failed', label: 'Pipeline failed' },
    { id: 'alert_critical', label: 'Critical alert triggered' },
    { id: 'alert_high', label: 'High severity alert' },
    { id: 'security_scan', label: 'Security scan complete' },
    { id: 'cert_expiry', label: 'Certificate expiring soon' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Notifications</h2>
        <p className="text-xs text-muted-foreground mt-1">Choose how and when you want to be notified.</p>
      </div>

      {/* Channels */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Channels</h3>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {channels.map((ch, i) => (
            <div key={ch.id} className={cn('flex items-center justify-between px-4 py-3', i !== channels.length - 1 && 'border-b border-border/50')}>
              <span className="text-sm text-foreground">{ch.label}</span>
              <button className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                i === 0 || i === 1 ? 'bg-primary' : 'bg-muted border border-border'
              )}>
                <span className={cn(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                  i === 0 || i === 1 ? 'translate-x-[18px]' : 'translate-x-0.5'
                )} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Events */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notify me when</h3>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {events.map((ev, i) => (
            <div key={ev.id} className={cn('flex items-center justify-between px-4 py-3', i !== events.length - 1 && 'border-b border-border/50')}>
              <span className="text-sm text-foreground">{ev.label}</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function APIKeysSection() {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (id: string) => {
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">API Keys</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage API keys for programmatic access.</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors">
          <Plus className="h-3.5 w-3.5" />
          Generate new key
        </button>
      </div>

      <div className="space-y-3">
        {apiKeys.map((key) => (
          <div key={key.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{key.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Created {key.createdAt} · Last used {key.lastUsed}</p>
              </div>
              <button className="text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Key value */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
              <code className="flex-1 text-xs font-mono text-foreground">
                {revealed === key.id ? `${key.prefix}••••••••••••••••••••••••••••` : `${key.prefix}${'•'.repeat(32)}`}
              </code>
              <button onClick={() => setRevealed(revealed === key.id ? null : key.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                {revealed === key.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => handleCopy(key.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                {copied === key.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Scopes */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {key.scopes.map((scope) => (
                <span key={scope} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {scope}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          API keys grant access to your GuardRail resources. Keep them secret and rotate regularly.
          <a href="#" className="ml-1 text-primary hover:underline">Learn about key scopes</a>
        </p>
      </div>
    </div>
  )
}

function SecuritySection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Security</h2>
        <p className="text-xs text-muted-foreground mt-1">Manage authentication and security settings.</p>
      </div>

      {/* 2FA */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Two-Factor Authentication</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">Enabled</span>
        </div>
        <button className="text-xs font-medium text-primary hover:underline">Manage 2FA settings</button>
      </div>

      {/* Password */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">Change Password</p>
        {[
          { label: 'Current Password', id: 'current' },
          { label: 'New Password', id: 'new' },
          { label: 'Confirm New Password', id: 'confirm' },
        ].map(({ label, id }) => (
          <div key={id} className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <input
              type="password"
              placeholder="••••••••••••"
              className="w-full max-w-xs rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>
        ))}
        <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors">
          <Save className="h-3.5 w-3.5" />
          Update password
        </button>
      </div>

      {/* Sessions */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Active Sessions</p>
        {[
          { device: 'MacBook Pro (Current)', browser: 'Chrome 128', location: 'San Francisco, US', time: 'Now' },
          { device: 'iPhone 15 Pro', browser: 'Safari Mobile', location: 'San Francisco, US', time: '2 hours ago' },
        ].map((session, i) => (
          <div key={i} className={cn('flex items-center justify-between', i === 0 ? '' : 'pt-3 border-t border-border/50')}>
            <div>
              <p className="text-xs font-medium text-foreground">{session.device}</p>
              <p className="text-[11px] text-muted-foreground">{session.browser} · {session.location} · {session.time}</p>
            </div>
            {i !== 0 && (
              <button className="text-xs font-medium text-red-400 hover:underline">Revoke</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function IntegrationsSection() {
  const [connected, setConnected] = useState<Set<string>>(
    new Set(integrations.filter((i) => i.connected).map((i) => i.id))
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Integrations</h2>
        <p className="text-xs text-muted-foreground mt-1">Connect GuardRail with your favorite tools.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {integrations.map((integration) => {
          const isConnected = connected.has(integration.id)
          return (
            <div key={integration.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-xl flex-shrink-0">
                {integration.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{integration.desc}</p>
              </div>
              <button
                onClick={() => {
                  setConnected(prev => {
                    const next = new Set(prev)
                    if (next.has(integration.id)) next.delete(integration.id)
                    else next.add(integration.id)
                    return next
                  })
                }}
                className={cn(
                  'flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  isConnected
                    ? 'border-border bg-muted text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                    : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                )}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  profile: ProfileSection,
  organization: OrganizationSection,
  team: TeamSection,
  notifications: NotificationsSection,
  apikeys: APIKeysSection,
  security: SecuritySection,
  integrations: IntegrationsSection,
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')
  const ActiveComponent = SECTION_COMPONENTS[activeSection] ?? ProfileSection

  return (
    <AppShell>
      <TopNav
        title="Settings"
        subtitle="Manage your account, organization, and integrations"
      />
      <div className="p-6">
        <div className="flex gap-6 max-w-5xl">
          {/* Left nav */}
          <aside className="w-52 flex-shrink-0">
            <div className="sticky top-20">
              <SectionNav active={activeSection} onSelect={setActiveSection} />
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div className="rounded-xl border border-border bg-card p-6">
              <ActiveComponent />
            </div>
          </main>
        </div>
      </div>
    </AppShell>
  )
}
