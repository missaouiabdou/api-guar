'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { pipelines } from '@/lib/data'
import { GitMerge, Clock, User, GitBranch, ChevronDown, Play, RefreshCw, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PipelinesPage() {
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>('p1')

  const stageIcon = (status: string) => {
    if (status === 'success') return '✓'
    if (status === 'failed') return '✗'
    if (status === 'running') return '⟳'
    return '○'
  }

  const stageClass = (status: string) => {
    if (status === 'success') return 'border-green-500/40 bg-green-500/10 text-green-400'
    if (status === 'failed') return 'border-red-500/40 bg-red-500/10 text-red-400'
    if (status === 'running') return 'border-blue-500/40 bg-blue-500/10 text-blue-400'
    return 'border-border bg-muted text-muted-foreground'
  }

  const successRate = Math.round((pipelines.filter(p => p.status === 'success').length / pipelines.length) * 100)

  return (
    <AppShell>
      <TopNav
        title="Pipelines"
        subtitle="CI/CD pipeline runs and job status"
        actions={<ActionButton label="Trigger Pipeline" icon={Play} />}
      />
      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Runs', value: String(pipelines.length * 12), color: 'text-foreground' },
            { label: 'Success Rate', value: `${successRate}%`, color: 'text-green-400' },
            { label: 'Avg Duration', value: '3m 45s', color: 'text-foreground' },
            { label: 'Running Now', value: String(pipelines.filter(p => p.status === 'running').length), color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-2">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Pipeline List */}
        <div className="space-y-3">
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Pipeline Header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-accent/20 transition-colors"
                onClick={() => setExpandedPipeline(expandedPipeline === pipeline.id ? null : pipeline.id)}
              >
                <StatusBadge status={pipeline.status} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{pipeline.name}</h3>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{pipeline.projectName}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      <code className="font-mono">{pipeline.branch}</code>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {pipeline.duration}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {pipeline.triggeredBy}
                    </div>
                  </div>
                </div>

                {/* Stage Summary */}
                <div className="hidden lg:flex items-center gap-1.5">
                  {pipeline.stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={cn('flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium', stageClass(stage.status))}>
                        <span>{stageIcon(stage.status)}</span>
                        <span>{stage.name}</span>
                      </div>
                      {i < pipeline.stages.length - 1 && <div className="h-px w-3 bg-border" />}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedPipeline === pipeline.id && 'rotate-180')} />
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedPipeline === pipeline.id && (
                <div className="border-t border-border bg-background/50 px-5 py-4 space-y-4">

                  {/* Stage Timeline */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stage Timeline</p>
                    <div className="space-y-2">
                      {pipeline.stages.map((stage, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold', stageClass(stage.status))}>
                            {i + 1}
                          </div>
                          <div className="flex-1 flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <span className="text-xs font-medium text-foreground">{stage.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{stage.duration}</span>
                              <StatusBadge status={stage.status} size="sm" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Logs Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Logs</p>
                      <button className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <FileText className="h-3 w-3" />
                        View full logs
                      </button>
                    </div>
                    <div className="rounded-xl border border-border bg-background overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                        <div className="flex gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                          <div className="h-2.5 w-2.5 rounded-full bg-orange-500/60" />
                          <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                        </div>
                        <span className="text-[11px] text-muted-foreground">pipeline.log</span>
                      </div>
                      <div className="p-3 font-mono text-[11px] leading-relaxed space-y-0.5 max-h-40 overflow-y-auto">
                        <p><span className="text-muted-foreground">$</span> <span className="text-green-400">git checkout</span> <span className="text-foreground">main</span></p>
                        <p><span className="text-muted-foreground">HEAD is now at a3f91bc</span></p>
                        <p><span className="text-muted-foreground">$</span> <span className="text-green-400">docker build</span> <span className="text-foreground">-t api-gateway:latest .</span></p>
                        <p><span className="text-blue-400">[+] Building 45.2s (12/12) FINISHED</span></p>
                        <p><span className="text-muted-foreground">$</span> <span className="text-green-400">go test</span> <span className="text-foreground">./...</span></p>
                        <p><span className="text-green-400">ok</span> <span className="text-foreground">github.com/acme/api-gateway 2.044s</span></p>
                        {pipeline.status === 'failed' && (
                          <>
                            <p><span className="text-muted-foreground">$</span> <span className="text-green-400">go test</span> <span className="text-foreground">-run TestAuth ./...</span></p>
                            <p><span className="text-red-400">FAIL: TestAuthJWTRS256 (unexpected algorithm: RS256)</span></p>
                            <p><span className="text-red-400">FAIL github.com/acme/auth-service 1.442s</span></p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  )
}
