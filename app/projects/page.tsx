'use client'

import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import { projects } from '@/lib/data'
import {
  Plus, ExternalLink, GitBranch, Activity, MoreHorizontal,
  Globe, RefreshCw, Rocket, Search, Filter
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Environment } from '@/lib/types'

const envColor: Record<Environment, string> = {
  production: 'text-green-400 bg-green-500/10',
  staging: 'text-orange-400 bg-orange-500/10',
  development: 'text-blue-400 bg-blue-500/10',
  preview: 'text-purple-400 bg-purple-500/10',
}

const langColor: Record<string, string> = {
  'Go': 'bg-cyan-500',
  'TypeScript': 'bg-blue-500',
  'Rust': 'bg-orange-500',
  'Python': 'bg-yellow-500',
  'Node.js': 'bg-green-500',
}

export default function ProjectsPage() {
  return (
    <AppShell>
      <TopNav
        title="Projects"
        subtitle={`${projects.length} projects`}
        actions={
          <>
            <ActionButton label="Filter" icon={Filter} variant="secondary" />
            <ActionButton label="New Project" icon={Plus} />
          </>
        }
      />
      <div className="p-6 space-y-5">

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted px-3.5 py-2.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input type="text" placeholder="Search projects..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <select className="bg-transparent text-xs text-muted-foreground focus:outline-none cursor-pointer">
              <option>All environments</option>
              <option>Production</option>
              <option>Staging</option>
              <option>Development</option>
            </select>
          </div>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="group rounded-xl border border-border bg-card p-5 hover:border-border/80 hover:shadow-lg hover:shadow-black/20 transition-all duration-200">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{project.name[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <Link href={`/projects/${project.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                      {project.name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={cn('h-2 w-2 rounded-full flex-shrink-0', langColor[project.language] ?? 'bg-gray-500')} />
                      <span className="text-[11px] text-muted-foreground">{project.language}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={project.status} size="sm" />
                  <button className="ml-1 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Repo URL */}
              <a href={`https://${project.repoUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors mb-4">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{project.repoUrl}</span>
              </a>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Environment</p>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', envColor[project.environment])}>
                    {project.environment}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Branch</p>
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-foreground font-mono truncate">{project.branch}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Strategy</p>
                  <span className="text-xs text-foreground">{project.deploymentStrategy}</span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Last Deploy</p>
                  <div className="flex items-center gap-1">
                    <Rocket className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-foreground">{project.lastDeployed}</span>
                  </div>
                </div>
              </div>

              {/* Health Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Health</span>
                  </div>
                  <span className={cn('text-xs font-semibold', project.health >= 90 ? 'text-green-400' : project.health >= 70 ? 'text-orange-400' : 'text-red-400')}>
                    {project.health}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', project.health >= 90 ? 'bg-green-500' : project.health >= 70 ? 'bg-orange-500' : 'bg-red-500')}
                    style={{ width: `${project.health}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/projects/${project.id}`} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
                  <Activity className="h-3 w-3" />
                  Details
                </Link>
                <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                  <RefreshCw className="h-3 w-3" />
                  Deploy
                </button>
              </div>
            </div>
          ))}

          {/* Empty State Card */}
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-5 flex flex-col items-center justify-center gap-3 min-h-[240px] hover:border-primary/30 transition-colors cursor-pointer group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Add new project</p>
              <p className="text-xs text-muted-foreground mt-0.5">Connect a GitHub repository</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
