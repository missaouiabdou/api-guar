'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import { auditLogs } from '@/lib/data'
import {
  Download, Filter, Search, CheckCircle2, XCircle,
  Rocket, Key, Webhook, GitMerge, User, ShieldCheck, Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'

const resourceTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Deployment: Rocket,
  Secret: Key,
  Webhook: Webhook,
  Pipeline: GitMerge,
  User: User,
  APIKey: Key,
  Auth: Lock,
}

const actionColorMap: Record<string, string> = {
  'deploy.create': 'text-blue-400',
  'secret.view': 'text-yellow-400',
  'pipeline.trigger': 'text-purple-400',
  'user.invite': 'text-green-400',
  'webhook.delete': 'text-red-400',
  'apikey.rotate': 'text-orange-400',
  'auth.login': 'text-cyan-400',
}

const RESOURCE_TYPES = ['All', 'Deployment', 'Secret', 'Webhook', 'Pipeline', 'User', 'APIKey', 'Auth']

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failure'>('all')

  const filtered = auditLogs.filter((log) => {
    const matchSearch =
      search === '' ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All' || log.resourceType === typeFilter
    const matchStatus = statusFilter === 'all' || log.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const successCount = auditLogs.filter((l) => l.status === 'success').length
  const failureCount = auditLogs.filter((l) => l.status === 'failure').length

  return (
    <AppShell>
      <TopNav
        title="Audit Logs"
        subtitle="Complete trail of all actions and changes in your organization"
        actions={
          <div className="flex items-center gap-2">
            <ActionButton label="Export CSV" icon={Download} variant="secondary" />
            <ActionButton label="Configure Retention" icon={ShieldCheck} />
          </div>
        }
      />
      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Events', value: auditLogs.length, sub: 'Last 7 days', color: 'text-foreground' },
            { label: 'Successful', value: successCount, sub: 'Actions completed', color: 'text-green-400' },
            { label: 'Failed', value: failureCount, sub: 'Actions blocked', color: 'text-red-400' },
            { label: 'Unique Users', value: [...new Set(auditLogs.map((l) => l.user))].length, sub: 'Active actors', color: 'text-blue-400' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 flex-1 min-w-48 max-w-72">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search user, action, resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {(['all', 'success', 'failure'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[11px] font-medium capitalize transition-colors',
                  statusFilter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Resource type */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1 flex-wrap">
            {RESOURCE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'rounded-lg px-2 py-1 text-[11px] font-medium transition-colors',
                  typeFilter === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            </span>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Filter className="h-3 w-3" />
              Advanced filters
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Time', 'User', 'Action', 'Resource', 'Type', 'IP Address', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const TypeIcon = resourceTypeIcons[log.resourceType] || ShieldCheck
                  const actionColor = actionColorMap[log.action] || 'text-foreground'
                  return (
                    <tr
                      key={log.id}
                      className={cn(
                        'border-b border-border/50 hover:bg-accent/20 transition-colors',
                        i % 2 === 0 ? '' : 'bg-muted/10'
                      )}
                    >
                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-foreground">{new Date(log.createdAt).toLocaleDateString()}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</p>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white',
                            log.user === 'unknown' ? 'bg-red-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          )}>
                            {log.user === 'unknown' ? '?' : log.user[0].toUpperCase()}
                          </div>
                          <span className="text-xs text-foreground font-medium">{log.user}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <code className={cn('text-xs font-mono font-medium', actionColor)}>{log.action}</code>
                      </td>

                      {/* Resource */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-foreground truncate">{log.resource}</p>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <TypeIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{log.resourceType}</span>
                        </div>
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-muted-foreground">{log.ipAddress}</code>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {log.status === 'success' ? (
                          <span className="flex items-center gap-1.5 text-xs text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-red-400">
                            <XCircle className="h-3.5 w-3.5" />
                            Failure
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">No events found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Retention Notice */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Audit logs are retained for <span className="text-foreground font-medium">90 days</span> on your current plan.
            Upgrade to Enterprise for unlimited retention and SIEM integration.
          </p>
          <button className="ml-auto flex-shrink-0 text-xs font-medium text-primary hover:underline">
            View plans
          </button>
        </div>

      </div>
    </AppShell>
  )
}
