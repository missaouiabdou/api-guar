'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { alerts } from '@/lib/data'
import type { Alert } from '@/lib/types'
import {
  Bell, BellOff, CheckCheck, ChevronDown, ChevronRight,
  Clock, MessageSquare, User, Filter, Cpu, Database,
  ShieldAlert, Zap, AlertTriangle, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Kubernetes: Cpu,
  Prometheus: Database,
  CertManager: ShieldAlert,
  APM: Zap,
  Snyk: ShieldAlert,
  Security: ShieldAlert,
}

const statusConfig = {
  open: { label: 'Open', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  acknowledged: { label: 'Acknowledged', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  resolved: { label: 'Resolved', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
}

function AlertRow({ alert, isSelected, onSelect }: { alert: Alert; isSelected: boolean; onSelect: () => void }) {
  const status = statusConfig[alert.status]
  const SourceIcon = sourceIcons[alert.source] || AlertTriangle

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor(diff / 60000)
    if (h > 24) return `${Math.floor(h / 24)}d ago`
    if (h > 0) return `${h}h ago`
    return `${m}m ago`
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-150',
        isSelected
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-card hover:border-border/80 hover:bg-accent/20'
      )}
    >
      {/* Severity indicator */}
      <div className="flex-shrink-0 mt-0.5">
        <StatusBadge severity={alert.severity} size="sm" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground leading-snug">{alert.title}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
              status.bg, status.border, status.color
            )}>
              {status.label}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SourceIcon className="h-3 w-3" />
            {alert.source}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {alert.assignedTo}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeAgo(alert.createdAt)}
          </span>
          {alert.comments > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {alert.comments} comment{alert.comments !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className={cn(
        'h-4 w-4 flex-shrink-0 mt-0.5 transition-colors',
        isSelected ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground'
      )} />
    </div>
  )
}

function AlertDetail({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const status = statusConfig[alert.status]
  const SourceIcon = sourceIcons[alert.source] || AlertTriangle

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{alert.title}</h3>
        <button onClick={onClose} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Severity', value: <StatusBadge severity={alert.severity} size="sm" /> },
          { label: 'Status', value: <span className={cn('text-xs font-medium', status.color)}>{status.label}</span> },
          { label: 'Source', value: <span className="flex items-center gap-1.5 text-xs text-foreground"><SourceIcon className="h-3 w-3 text-muted-foreground" />{alert.source}</span> },
          { label: 'Assigned', value: <span className="text-xs text-foreground">{alert.assignedTo}</span> },
          { label: 'Created', value: <span className="text-xs text-foreground">{new Date(alert.createdAt).toLocaleString()}</span> },
          { label: 'Updated', value: <span className="text-xs text-foreground">{new Date(alert.updatedAt).toLocaleString()}</span> },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <div>{value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {alert.status !== 'acknowledged' && (
          <button className="flex items-center gap-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors">
            <Bell className="h-3.5 w-3.5" />
            Acknowledge
          </button>
        )}
        {alert.status !== 'resolved' && (
          <button className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors">
            <CheckCheck className="h-3.5 w-3.5" />
            Resolve
          </button>
        )}
        <button className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <BellOff className="h-3.5 w-3.5" />
          Silence 1h
        </button>
      </div>

      {/* Comments placeholder */}
      {alert.comments > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-foreground mb-3">Comments ({alert.comments})</p>
          <div className="space-y-2.5">
            {Array.from({ length: alert.comments }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-white">SC</span>
                </div>
                <div className="flex-1 rounded-lg bg-muted p-2.5">
                  <p className="text-[11px] font-medium text-foreground">sarah.chen</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Investigating the issue. CPU spike correlates with the new batch job scheduled at 09:00.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const FILTERS = ['all', 'open', 'acknowledged', 'resolved'] as const
const SEVERITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low'] as const

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState<typeof FILTERS[number]>('all')
  const [severityFilter, setSeverityFilter] = useState<typeof SEVERITY_FILTERS[number]>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = alerts.filter((a) => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    const matchSev = severityFilter === 'all' || a.severity === severityFilter
    return matchStatus && matchSev
  })

  const selected = alerts.find((a) => a.id === selectedId) ?? null

  const openCount = alerts.filter((a) => a.status === 'open').length
  const critCount = alerts.filter((a) => a.severity === 'critical').length
  const ackCount = alerts.filter((a) => a.status === 'acknowledged').length

  return (
    <AppShell>
      <TopNav
        title="Alerts"
        subtitle="Monitor and respond to infrastructure and security alerts"
        actions={
          <div className="flex items-center gap-2">
            <ActionButton label="Configure Rules" icon={Filter} variant="secondary" />
            <ActionButton label="New Alert Rule" icon={Bell} />
          </div>
        }
      />
      <div className="p-6 space-y-5">

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Open Alerts', value: openCount, icon: Bell, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Critical', value: critCount, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Acknowledged', value: ackCount, icon: CheckCheck, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0', bg)}>
                <Icon className={cn('h-4.5 w-4.5', color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[11px] font-medium capitalize transition-colors',
                  statusFilter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f}
                {f !== 'all' && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    {alerts.filter((a) => a.status === f).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {SEVERITY_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setSeverityFilter(f)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[11px] font-medium capitalize transition-colors',
                  severityFilter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Alert list + detail panel */}
        <div className={cn(
          'grid gap-4',
          selected ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'
        )}>
          {/* List */}
          <div className={cn('space-y-2', selected ? 'lg:col-span-3' : '')}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
                <CheckCheck className="h-8 w-8 text-green-400 mb-3" />
                <p className="text-sm font-medium text-foreground">All clear</p>
                <p className="text-xs text-muted-foreground mt-1">No alerts match the current filters</p>
              </div>
            ) : (
              filtered.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  isSelected={selectedId === alert.id}
                  onSelect={() => setSelectedId(selectedId === alert.id ? null : alert.id)}
                />
              ))
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="lg:col-span-2">
              <AlertDetail alert={selected} onClose={() => setSelectedId(null)} />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
