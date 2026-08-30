'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { vulnerabilities } from '@/lib/data'
import {
  ShieldCheck, ShieldAlert, Package, Key, Container, Code2,
  AlertTriangle, CheckCircle2, Scan, Filter, ArrowRight, TrendingDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

const scanTypes = [
  { id: 'dependency', label: 'Dependency Scan', icon: Package, score: 72, issues: 3, critical: 1 },
  { id: 'secret', label: 'Secrets Scan', icon: Key, score: 45, issues: 2, critical: 1 },
  { id: 'container', label: 'Container Scan', icon: Container, score: 88, issues: 1, critical: 0 },
  { id: 'code', label: 'Code Scan', icon: Code2, score: 91, issues: 1, critical: 0 },
]

const recommendations = [
  { id: 1, title: 'Rotate exposed AWS credentials immediately', severity: 'critical', action: 'Rotate now' },
  { id: 2, title: 'Update lodash to v4.17.21 to fix RCE vulnerability', severity: 'critical', action: 'Update package' },
  { id: 3, title: 'Enable 2FA for all admin accounts', severity: 'high', action: 'Configure' },
  { id: 4, title: 'Update base Docker image to node:18-alpine', severity: 'medium', action: 'Update image' },
]

export default function SecurityPage() {
  const [activeFilter, setActiveFilter] = useState('all')

  const overallScore = 74
  const scoreColor = overallScore >= 90 ? 'text-green-400' : overallScore >= 70 ? 'text-orange-400' : 'text-red-400'
  const scoreRing = overallScore >= 90 ? '#16a34a' : overallScore >= 70 ? '#f97316' : '#ef4444'

  const filtered = activeFilter === 'all' ? vulnerabilities : vulnerabilities.filter(v => v.type === activeFilter)
  const critCount = vulnerabilities.filter(v => v.severity === 'critical').length
  const highCount = vulnerabilities.filter(v => v.severity === 'high').length

  return (
    <AppShell>
      <TopNav
        title="Security"
        subtitle="Vulnerability management and security posture"
        actions={<ActionButton label="Run Scan" icon={Scan} />}
      />
      <div className="p-6 space-y-6">

        {/* Security Score + Scan Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Score */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#21262d" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke={scoreRing} strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 42 * overallScore / 100} ${2 * Math.PI * 42}`}
                  strokeLinecap="round" transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${scoreColor}`}>{overallScore}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">Security Score</h3>
              <p className="text-xs text-muted-foreground">Your security posture needs improvement</p>
              <div className="flex items-center gap-1.5 text-xs text-orange-400">
                <TrendingDown className="h-3 w-3" />
                <span>Down 3 points this week</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">{critCount} Critical</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-xs text-muted-foreground">{highCount} High</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scan Type Cards */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-3">
            {scanTypes.map((scan) => (
              <div key={scan.id} className="rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <scan.icon className="h-4 w-4 text-primary" />
                  </div>
                  {scan.critical > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      {scan.critical} Critical
                    </span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  )}
                </div>
                <p className="text-xs font-semibold text-foreground">{scan.label}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={cn('text-lg font-bold', scan.score >= 90 ? 'text-green-400' : scan.score >= 70 ? 'text-orange-400' : 'text-red-400')}>
                    {scan.score}
                  </span>
                  <span className="text-xs text-muted-foreground">{scan.issues} issues</span>
                </div>
                <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', scan.score >= 90 ? 'bg-green-500' : scan.score >= 70 ? 'bg-orange-500' : 'bg-red-500')}
                    style={{ width: `${scan.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vulnerability Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Vulnerabilities ({vulnerabilities.length})</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
                {['all', 'dependency', 'secret', 'container', 'code'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors capitalize',
                      activeFilter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Filter className="h-3 w-3" />
                Filter
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Severity', 'Title', 'Package', 'Version', 'Fix Available', 'Type', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((vuln) => (
                  <tr key={vuln.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3"><StatusBadge severity={vuln.severity} size="sm" /></td>
                    <td className="px-4 py-3 max-w-xs"><p className="text-xs text-foreground leading-snug">{vuln.title}</p></td>
                    <td className="px-4 py-3"><code className="text-xs font-mono text-primary">{vuln.package}</code></td>
                    <td className="px-4 py-3"><code className="text-xs font-mono text-muted-foreground">{vuln.version}</code></td>
                    <td className="px-4 py-3">
                      {vuln.fixedIn !== '-' ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <code className="font-mono">{vuln.fixedIn}</code>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">{vuln.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                        Fix <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Recommendations</h3>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div key={rec.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-border/80 transition-all">
                <StatusBadge severity={rec.severity as 'critical' | 'high' | 'medium' | 'low'} size="sm" className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{rec.title}</p>
                </div>
                <button className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors flex-shrink-0">
                  <ArrowRight className="h-3 w-3" />
                  {rec.action}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
