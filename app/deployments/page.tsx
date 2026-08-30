'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { TopNav } from '@/components/layout/top-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { deployments } from '@/lib/data'
import {
  Rocket, GitBranch, User, Clock, Server, ChevronDown,
  Cpu, MemoryStick, RefreshCw, Container, Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'

const pods = [
  { name: 'api-gateway-7d4f9-xk2lp', status: 'Running', cpu: '245m', memory: '128Mi', restarts: 0, age: '2h' },
  { name: 'api-gateway-7d4f9-m9qrt', status: 'Running', cpu: '312m', memory: '156Mi', restarts: 0, age: '2h' },
  { name: 'api-gateway-7d4f9-n7yws', status: 'Running', cpu: '198m', memory: '112Mi', restarts: 1, age: '1d' },
]

export default function DeploymentsPage() {
  const [expanded, setExpanded] = useState<string | null>('d1')
  const [envFilter, setEnvFilter] = useState('all')

  const filtered = envFilter === 'all' ? deployments : deployments.filter(d => d.environment === envFilter)

  return (
    <AppShell>
      <TopNav title="Deployments" subtitle="Deployment history and infrastructure" />
      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Deployments', value: '142', sub: 'all time' },
            { label: 'Today', value: '8', sub: 'deployments' },
            { label: 'Success Rate', value: '91%', sub: 'last 30 days' },
            { label: 'Avg Deploy Time', value: '2m 48s', sub: 'last 30 days' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-2">{label}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Environment Filter */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted w-fit p-1">
          {['all', 'production', 'staging', 'development'].map((env) => (
            <button
              key={env}
              onClick={() => setEnvFilter(env)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                envFilter === env ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {env}
            </button>
          ))}
        </div>

        {/* Deployments Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-8 px-4 py-3" />
                {['Status', 'Project', 'Commit', 'Branch', 'Environment', 'Author', 'Duration', 'Namespace'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((dep) => (
                <>
                  <tr
                    key={dep.id}
                    className="border-b border-border/50 hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === dep.id ? null : dep.id)}
                  >
                    <td className="px-4 py-3">
                      <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', expanded === dep.id && 'rotate-180')} />
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={dep.status} size="sm" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Rocket className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">{dep.projectName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <code className="text-xs font-mono text-primary">{dep.commit}</code>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{dep.commitMessage}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3 text-muted-foreground" />
                        <code className="text-xs font-mono text-muted-foreground">{dep.branch}</code>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                        dep.environment === 'production' ? 'bg-green-500/10 text-green-400' :
                        dep.environment === 'staging' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-blue-500/10 text-blue-400'
                      )}>
                        {dep.environment}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{dep.author}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{dep.duration}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Server className="h-3 w-3 text-muted-foreground" />
                        <code className="text-xs font-mono text-muted-foreground">{dep.namespace}</code>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded K8s Info */}
                  {expanded === dep.id && (
                    <tr key={dep.id + '-k8s'} className="border-b border-border/50 bg-background/30">
                      <td colSpan={9} className="px-5 py-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kubernetes Namespace:</span>
                            <code className="text-xs text-primary font-mono">{dep.namespace}</code>
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] text-green-400">
                              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              ArgoCD Synced
                            </span>
                          </div>

                          {/* Pods Table */}
                          <div className="rounded-xl border border-border overflow-hidden">
                            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                              <Container className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-semibold text-muted-foreground">Pods ({pods.length}/3 Running)</span>
                            </div>
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border/50">
                                  {['Pod Name', 'Status', 'CPU', 'Memory', 'Restarts', 'Age'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {pods.map((pod) => (
                                  <tr key={pod.name} className="border-b border-border/30 hover:bg-accent/10">
                                    <td className="px-3 py-2"><code className="text-xs font-mono text-foreground">{pod.name}</code></td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                        <span className="text-xs text-green-400">{pod.status}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <Cpu className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-foreground">{pod.cpu}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <MemoryStick className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-foreground">{pod.memory}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={cn('text-xs font-medium', pod.restarts > 0 ? 'text-orange-400' : 'text-muted-foreground')}>
                                        {pod.restarts}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">{pod.age}</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Resource Summary */}
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Replica Sets', value: '3/3', icon: Layers, color: 'text-green-400' },
                              { label: 'Containers', value: '9', icon: Container, color: 'text-blue-400' },
                              { label: 'Restart Count', value: '1', icon: RefreshCw, color: pods.some(p => p.restarts > 0) ? 'text-orange-400' : 'text-green-400' },
                            ].map(({ label, value, icon: Icon, color }) => (
                              <div key={label} className="rounded-lg border border-border bg-muted/30 p-3">
                                <div className="flex items-center gap-2">
                                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                                  <span className="text-xs text-muted-foreground">{label}</span>
                                </div>
                                <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </AppShell>
  )
}
