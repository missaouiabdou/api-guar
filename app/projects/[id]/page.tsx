'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { projects, deployments, pipelines } from '@/lib/data'
import {
  ArrowLeft, GitBranch, Rocket, GitMerge, Settings, Globe,
  Key, Code, Activity, ExternalLink, Clock, User
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'deployments' | 'pipelines' | 'variables' | 'settings'

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'deployments', label: 'Deployments', icon: Rocket },
  { id: 'pipelines', label: 'Pipelines', icon: GitMerge },
  { id: 'variables', label: 'Variables', icon: Key },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const project = projects.find(p => p.id === params.id) ?? projects[0]
  const projectDeployments = deployments.filter(d => d.projectId === project.id)
  const projectPipelines = pipelines.filter(p => p.projectName === project.name)

  return (
    <AppShell>
      <TopNav
        title={project.name}
        subtitle={project.repoUrl}
        actions={
          <>
            <Link href="/projects" className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <ActionButton label="Deploy" icon={Rocket} />
          </>
        }
      />
      <div className="p-6 space-y-5">

        {/* Project Header */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0">
              <span className="text-lg font-bold text-primary">{project.name[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">{project.name}</h2>
                <StatusBadge status={project.status} />
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">{project.environment}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-4 flex-wrap">
                <a href={`https://${project.repoUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  {project.repoUrl}
                </a>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  {project.branch}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Rocket className="h-3 w-3" />
                  {project.deploymentStrategy}
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-muted-foreground">Health Score</p>
              <p className={cn('text-2xl font-bold', project.health >= 90 ? 'text-green-400' : project.health >= 70 ? 'text-orange-400' : 'text-red-400')}>
                {project.health}%
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Deployments */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Recent Deployments</h3>
              <div className="space-y-3">
                {projectDeployments.length > 0 ? projectDeployments.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors">
                    <StatusBadge status={dep.status} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground font-mono">{dep.commit}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{dep.commitMessage}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">{dep.duration}</p>
                      <p className="text-[11px] text-muted-foreground">{dep.author}</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Rocket className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No deployments yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project Info</h3>
                {[
                  { label: 'Language', value: project.language, icon: Code },
                  { label: 'Environment', value: project.environment, icon: Globe },
                  { label: 'Last Deploy', value: project.lastDeployed, icon: Clock },
                  { label: 'Strategy', value: project.deploymentStrategy, icon: Rocket },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <span className="text-xs font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deployments' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Status', 'Commit', 'Message', 'Branch', 'Author', 'Duration'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectDeployments.map((dep) => (
                  <tr key={dep.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3"><StatusBadge status={dep.status} size="sm" /></td>
                    <td className="px-4 py-3"><code className="text-xs font-mono text-primary">{dep.commit}</code></td>
                    <td className="px-4 py-3 max-w-xs"><p className="text-xs text-foreground truncate">{dep.commitMessage}</p></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1"><GitBranch className="h-3 w-3 text-muted-foreground" /><span className="text-xs font-mono text-muted-foreground">{dep.branch}</span></div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1"><User className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{dep.author}</span></div></td>
                    <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{dep.duration}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Environment variables are encrypted at rest and never exposed in logs.</p>
              <ActionButton label="Add Variable" icon={Key} />
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Key', 'Value', 'Environment', 'Last Updated'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'DATABASE_URL', value: '••••••••••••', env: 'production', updated: '3 days ago' },
                    { key: 'API_KEY', value: '••••••••••••', env: 'all', updated: '1 week ago' },
                    { key: 'NODE_ENV', value: 'production', env: 'production', updated: '1 month ago' },
                    { key: 'PORT', value: '3000', env: 'all', updated: '2 months ago' },
                  ].map((v) => (
                    <tr key={v.key} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3"><code className="text-xs font-mono text-foreground">{v.key}</code></td>
                      <td className="px-4 py-3"><code className="text-xs font-mono text-muted-foreground">{v.value}</code></td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{v.env}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{v.updated}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pipelines' && (
          <div className="space-y-3">
            {projectPipelines.length > 0 ? projectPipelines.map((pipeline) => (
              <div key={pipeline.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={pipeline.status} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{pipeline.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <GitBranch className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-muted-foreground">{pipeline.branch}</span>
                        <span className="text-muted-foreground">·</span>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{pipeline.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pipeline.stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={cn(
                        'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium',
                        stage.status === 'success' ? 'bg-green-500/10 text-green-400' :
                        stage.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                        stage.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {stage.name}
                      </div>
                      {i < pipeline.stages.length - 1 && <div className="h-px w-4 bg-border flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border">
                <GitMerge className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No pipelines configured</p>
                <p className="text-xs text-muted-foreground mt-1">Connect a CI/CD workflow to get started</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">General Settings</h3>
              {[{ label: 'Project Name', value: project.name }, { label: 'Repository URL', value: project.repoUrl }, { label: 'Default Branch', value: project.branch }].map(({ label, value }) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <input defaultValue={value} className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors" />
                </div>
              ))}
              <button className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors">Save changes</button>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
              <p className="text-xs text-muted-foreground">Once you delete a project, there is no going back.</p>
              <button className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">Delete project</button>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
