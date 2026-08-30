'use client'

import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { Plus, Webhook, Copy, Trash2, CheckCircle2, Clock, GitBranch, Activity } from 'lucide-react'

const webhooks = [
  { id: 'wh1', name: 'API Gateway Deploy Hook', url: 'https://guardrail.acme.com/hooks/abc123...', secret: 'gh_live_xxxxx', events: ['push', 'pull_request', 'workflow_run'], status: 'active', deliveries: 1243, failures: 2, lastDelivery: '2h ago', repo: 'acme/api-gateway' },
  { id: 'wh2', name: 'Frontend CI Trigger', url: 'https://guardrail.acme.com/hooks/def456...', secret: 'gh_live_yyyyy', events: ['push', 'release'], status: 'active', deliveries: 892, failures: 0, lastDelivery: '5h ago', repo: 'acme/frontend-app' },
  { id: 'wh3', name: 'Auth Service Webhook', url: 'https://guardrail.acme.com/hooks/ghi789...', secret: 'gh_live_zzzzz', events: ['push', 'pull_request'], status: 'inactive', deliveries: 234, failures: 8, lastDelivery: '1d ago', repo: 'acme/auth-service' },
  { id: 'wh4', name: 'Security Scan Hook', url: 'https://guardrail.acme.com/hooks/jkl012...', secret: 'gh_live_aaaaa', events: ['push', 'create'], status: 'active', deliveries: 445, failures: 1, lastDelivery: '30m ago', repo: 'acme/ml-inference' },
]

export default function WebhooksPage() {
  return (
    <AppShell>
      <TopNav
        title="Webhooks"
        subtitle="Manage incoming GitHub webhooks"
        actions={<ActionButton label="Create Webhook" icon={Plus} />}
      />
      <div className="p-6 space-y-5">

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Webhooks', value: '4', icon: Webhook, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Active Webhooks', value: '3', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Total Deliveries', value: '2,814', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Avg. Response', value: '124ms', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Webhook List */}
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-xl border border-border bg-card p-5 hover:border-border/80 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <Webhook className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{wh.name}</h3>
                      <StatusBadge status={wh.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <GitBranch className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{wh.repo}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* URL */}
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
                <code className="flex-1 text-xs text-muted-foreground truncate font-mono">{wh.url}</code>
                <button className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3 w-3" />
                </button>
              </div>

              {/* Events + Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {wh.events.map((event) => (
                    <span key={event} className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {event}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span><span className="font-semibold text-foreground">{wh.deliveries.toLocaleString()}</span> deliveries</span>
                  {wh.failures > 0 && <span className="text-red-400"><span className="font-semibold">{wh.failures}</span> failures</span>}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {wh.lastDelivery}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  )
}
