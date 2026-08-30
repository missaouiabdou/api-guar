'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { TopNav } from '@/components/layout/top-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { webhookEvents } from '@/lib/data'
import {
  Search, Filter, ChevronDown, ChevronRight, Copy, ChevronLeft,
  ChevronRight as ArrowRight, Eye, GitBranch, Clock, Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function EventsPage() {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  const allEvents = [
    ...webhookEvents,
    ...webhookEvents.map(e => ({ ...e, id: e.id + '_2', deliveryId: e.deliveryId + '-2' })),
    ...webhookEvents.map(e => ({ ...e, id: e.id + '_3', deliveryId: e.deliveryId + '-3' })),
  ]

  const filtered = filter === 'all' ? allEvents : allEvents.filter(e => e.status === filter)

  const examplePayload = {
    action: 'push',
    ref: 'refs/heads/main',
    repository: { full_name: 'acme/api-gateway', id: 123456 },
    pusher: { name: 'sarah.chen', email: 'sarah.chen@acme.com' },
    commits: [
      { id: 'a3f91bc', message: 'feat: add rate limiting middleware', author: { name: 'Sarah Chen' }, timestamp: '2025-08-02T09:08:00Z' }
    ],
    head_commit: { id: 'a3f91bc', message: 'feat: add rate limiting middleware' }
  }

  return (
    <AppShell>
      <TopNav title="Webhook Events" subtitle="Incoming event delivery log" />
      <div className="p-6 space-y-5">

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3.5 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search by repo, event, delivery ID..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-52" />
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {['all', 'success', 'failed', 'pending'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                  filter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 cursor-pointer">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Event type</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        {/* Events Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-8 px-4 py-3" />
                {['Status', 'Delivery ID', 'Repository', 'Event', 'Branch', 'Created At', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <>
                  <tr
                    key={event.id}
                    className="border-b border-border/50 hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                  >
                    <td className="w-8 px-4 py-3">
                      <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', expandedEvent === event.id && 'rotate-90')} />
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={event.status} size="sm" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <code className="text-xs font-mono text-primary">{event.deliveryId.slice(0, 16)}...</code>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-foreground">{event.repository}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{event.event}</span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-muted-foreground">{event.branch}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        <Eye className="h-3 w-3" />
                        Payload
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Payload Viewer */}
                  {expandedEvent === event.id && (
                    <tr key={event.id + '-payload'} className="border-b border-border/50">
                      <td colSpan={8} className="px-4 py-0">
                        <div className="my-3 rounded-xl border border-border bg-background overflow-hidden">
                          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/30">
                            <span className="text-xs font-semibold text-foreground">Payload — {event.deliveryId}</span>
                            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                              <Copy className="h-3 w-3" />
                              Copy
                            </button>
                          </div>
                          <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
                            <code className="text-green-400">{JSON.stringify(examplePayload, null, 2)
                              .replace(/"([^"]+)":/g, '<span style="color:#79c0ff">"$1"</span>:')}</code>
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, filtered.length)} of {filtered.length} events</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40" disabled={page === 1}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {[1, 2, 3].map(p => (
                <button key={p} onClick={() => setPage(p)} className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors', page === p ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => p + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
