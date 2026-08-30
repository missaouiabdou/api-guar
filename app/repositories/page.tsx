'use client'

import { AppShell } from '@/components/layout/app-shell'
import { TopNav, ActionButton } from '@/components/layout/top-nav'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  GitBranch, Star, Eye, GitFork, Plus, ExternalLink,
  Webhook, CheckCircle2, Clock, User, AlertCircle
} from 'lucide-react'

const repos = [
  {
    id: '1', name: 'api-gateway', org: 'acme', language: 'Go', stars: 234, forks: 18, watchers: 45,
    webhookStatus: 'active', connectedAccount: 'acme-bot', lastCommit: '2h ago', defaultBranch: 'main',
    openPRs: 3, private: false, description: 'High-performance API gateway with rate limiting and auth middleware'
  },
  {
    id: '2', name: 'frontend-app', org: 'acme', language: 'TypeScript', stars: 891, forks: 67, watchers: 112,
    webhookStatus: 'active', connectedAccount: 'acme-bot', lastCommit: '5h ago', defaultBranch: 'main',
    openPRs: 7, private: false, description: 'Next.js 16 frontend application with SSR and real-time updates'
  },
  {
    id: '3', name: 'auth-service', org: 'acme', language: 'Rust', stars: 156, forks: 12, watchers: 34,
    webhookStatus: 'error', connectedAccount: 'acme-bot', lastCommit: '1d ago', defaultBranch: 'develop',
    openPRs: 2, private: true, description: 'Zero-trust authentication service with JWT RS256 support'
  },
  {
    id: '4', name: 'data-pipeline', org: 'acme', language: 'Python', stars: 67, forks: 8, watchers: 22,
    webhookStatus: 'active', connectedAccount: 'acme-bot', lastCommit: '3d ago', defaultBranch: 'main',
    openPRs: 0, private: true, description: 'Kafka-based data streaming pipeline for analytics ingestion'
  },
  {
    id: '5', name: 'notification-svc', org: 'acme', language: 'Node.js', stars: 43, forks: 5, watchers: 15,
    webhookStatus: 'active', connectedAccount: 'acme-bot', lastCommit: '30m ago', defaultBranch: 'main',
    openPRs: 1, private: false, description: 'Multi-channel notification service with email, SMS and push support'
  },
  {
    id: '6', name: 'ml-inference', org: 'acme', language: 'Python', stars: 312, forks: 41, watchers: 78,
    webhookStatus: 'active', connectedAccount: 'acme-bot', lastCommit: '1h ago', defaultBranch: 'main',
    openPRs: 4, private: true, description: 'GPU-accelerated ML inference engine with batching and caching'
  },
]

const langColor: Record<string, string> = {
  'Go': 'bg-cyan-500',
  'TypeScript': 'bg-blue-500',
  'Rust': 'bg-orange-500',
  'Python': 'bg-yellow-500',
  'Node.js': 'bg-green-500',
}

const commits = [
  { sha: 'a3f91bc', message: 'feat: add rate limiting middleware', author: 'sarah.chen', time: '2h ago', repo: 'api-gateway' },
  { sha: 'b7e23da', message: 'fix: resolve hydration mismatch on login', author: 'marcus.dev', time: '5h ago', repo: 'frontend-app' },
  { sha: 'c91d5ef', message: 'refactor: migrate to JWT RS256', author: 'alex.kim', time: '1d ago', repo: 'auth-service' },
  { sha: 'g77b44d', message: 'feat: add GPU acceleration support', author: 'diana.lee', time: '1h ago', repo: 'ml-inference' },
  { sha: 'f55a23c', message: 'feat: add email queue retry logic', author: 'tom.walker', time: '30m ago', repo: 'notification-svc' },
]

const pullRequests = [
  { number: 142, title: 'fix: resolve login hydration mismatch', repo: 'frontend-app', author: 'marcus.dev', status: 'open', reviews: 2, updatedAt: '5h ago' },
  { number: 89, title: 'hotfix: fix kafka consumer config', repo: 'data-pipeline', author: 'priya.nair', status: 'open', reviews: 0, updatedAt: '3h ago' },
  { number: 56, title: 'feat: JWT RS256 migration', repo: 'auth-service', author: 'alex.kim', status: 'open', reviews: 1, updatedAt: '1d ago' },
  { number: 203, title: 'chore: update dependencies', repo: 'frontend-app', author: 'bot', status: 'open', reviews: 0, updatedAt: '2d ago' },
]

export default function RepositoriesPage() {
  return (
    <AppShell>
      <TopNav
        title="Repositories"
        subtitle="Connected GitHub repositories"
        actions={<ActionButton label="Connect Repository" icon={Plus} />}
      />
      <div className="p-6 space-y-6">

        {/* Repository Cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Connected Repositories ({repos.length})</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {repos.map((repo) => (
              <div key={repo.id} className="group rounded-xl border border-border bg-card p-4 hover:border-border/80 hover:shadow-lg hover:shadow-black/20 transition-all">
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <a href={`https://github.com/${repo.org}/${repo.name}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                          {repo.org}/{repo.name}
                        </a>
                        {repo.private && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/30 text-muted-foreground">Private</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{repo.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {repo.webhookStatus === 'active' ? (
                      <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span className="text-[11px] text-green-400">Webhook Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5">
                        <AlertCircle className="h-3 w-3 text-red-400" />
                        <span className="text-[11px] text-red-400">Webhook Error</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className={`h-2 w-2 rounded-full ${langColor[repo.language] ?? 'bg-gray-500'}`} />
                    {repo.language}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {repo.stars}
                  </div>
                  <div className="flex items-center gap-1">
                    <GitFork className="h-3 w-3" />
                    {repo.forks}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {repo.watchers}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {repo.lastCommit}
                  </div>
                  {repo.openPRs > 0 && (
                    <div className="flex items-center gap-1 text-orange-400">
                      <GitFork className="h-3 w-3" />
                      {repo.openPRs} open PRs
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Commits + PRs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Latest Commits</h3>
              <a href="#" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />GitHub</a>
            </div>
            <div className="space-y-3">
              {commits.map((commit) => (
                <div key={commit.sha} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{commit.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-[11px] font-mono text-primary">{commit.sha}</code>
                      <span className="text-[11px] text-muted-foreground">{commit.author}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{commit.time}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">{commit.repo}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Open Pull Requests</h3>
              <span className="text-xs font-medium text-orange-400">{pullRequests.length} open</span>
            </div>
            <div className="space-y-3">
              {pullRequests.map((pr) => (
                <div key={pr.number} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/30 transition-colors">
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/10 mt-0.5">
                    <GitFork className="h-3 w-3 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{pr.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">#{pr.number}</span>
                      <span className="text-[11px] text-muted-foreground">{pr.repo}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{pr.author}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status="warning" size="sm" showDot={false} />
                    <p className="text-[11px] text-muted-foreground mt-0.5">{pr.updatedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
