import { useState, useEffect } from 'react'
import { fetchProjects } from '../api/client'
import {
  FolderGit2,
  GitBranch,
  ExternalLink,
  Plus,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Shield,
  AlertTriangle,
  Clock
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-orange-500',
]

function avatarColor(name = '') {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function statusConfig(status) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return { label: 'Active', dot: 'bg-emerald-400', text: 'text-emerald-400', ring: 'border-emerald-500/20 bg-emerald-500/10' }
    case 'failed':
    case 'error':
      return { label: 'Failed', dot: 'bg-rose-400', text: 'text-rose-400', ring: 'border-rose-500/20 bg-rose-500/10' }
    case 'warning':
      return { label: 'Warning', dot: 'bg-amber-400', text: 'text-amber-400', ring: 'border-amber-500/20 bg-amber-500/10' }
    case 'running':
    case 'processing':
      return { label: 'Running', dot: 'bg-blue-400', text: 'text-blue-400', ring: 'border-blue-500/20 bg-blue-500/10' }
    default:
      return { label: status || 'Active', dot: 'bg-emerald-400', text: 'text-emerald-400', ring: 'border-emerald-500/20 bg-emerald-500/10' }
  }
}

function guessLanguage(project) {
  if (project.language) return project.language
  const desc = (project.description || '').toLowerCase()
  const repo = (project.github_repo || '').toLowerCase()
  const combined = desc + ' ' + repo
  if (combined.includes('typescript') || combined.includes('.ts')) return 'TypeScript'
  if (combined.includes('python') || combined.includes('.py')) return 'Python'
  if (combined.includes('rust')) return 'Rust'
  if (combined.includes('java') && !combined.includes('javascript')) return 'Java'
  if (combined.includes('golang') || combined.includes(' go ') || combined.includes('/go')) return 'Go'
  if (combined.includes('node') || combined.includes('javascript') || combined.includes('.js')) return 'Node.js'
  if (combined.includes('ruby') || combined.includes('rails')) return 'Ruby'
  return 'Ruby'
}

const LANGUAGE_COLORS = {
  TypeScript: 'text-blue-400',
  Python: 'text-yellow-400',
  Rust: 'text-orange-400',
  Java: 'text-red-400',
  Go: 'text-cyan-400',
  'Node.js': 'text-green-400',
  Ruby: 'text-rose-400',
  JavaScript: 'text-yellow-300',
}

function deriveEnv(project) {
  const branch = (project.default_branch || 'main').toLowerCase()
  if (branch === 'main' || branch === 'master') return 'production'
  if (branch.includes('staging') || branch.includes('stage')) return 'staging'
  if (branch.includes('develop') || branch.includes('dev')) return 'development'
  return 'production'
}

const ENV_COLORS = {
  production: 'bg-rose-500/20 text-rose-300',
  staging: 'bg-amber-500/20 text-amber-300',
  development: 'bg-blue-500/20 text-blue-300',
}

function healthColor(pct) {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-rose-500'
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Not scanned yet'
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  return `${days}d ago`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadProjects = () => {
    setLoading(true)
    fetchProjects()
      .then(res => {
        const list = res.data?.data || res.data || []
        setProjects(list)
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const filtered = projects.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.github_repo?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Projects</h1>
          <p className="text-gray-500 text-xs mt-0.5">{projects.length} connected project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadProjects}
            className="p-2 rounded-lg border border-[#1E293B] text-gray-400 hover:text-white hover:border-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1E293B] text-gray-400 hover:text-white hover:border-slate-600 transition-colors text-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Project
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1E293B] text-gray-400 hover:text-white text-sm transition-colors">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Production
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search projects by name or repo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#111726] border border-[#1E293B] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 h-56 animate-pulse" />
          ))}
        </div>
      )}

      {/* Cards Grid */}
      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => {
              const lang = guessLanguage(project)
              const status = statusConfig(project.status)
              const env = deriveEnv(project)
              const branch = project.default_branch || 'main'
              const scansCount = project.scans_count ?? 0
              const openVulnsCount = project.open_vulns_count ?? 0
              const hasScan = project.security_score !== null && project.security_score !== undefined
              const healthScore = hasScan ? project.security_score : (scansCount === 0 ? 100 : 0)
              const lastActivity = timeAgo(project.last_scanned_at || project.updated_at)

              return (
                <div
                  key={project.id}
                  className="bg-[#111726] border border-[#1E293B] hover:border-slate-600 transition-all rounded-xl p-5 flex flex-col gap-4 cursor-pointer group"
                >
                  {/* Top row: avatar + name + status */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${avatarColor(project.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {(project.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                            {project.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${LANGUAGE_COLORS[lang]?.replace('text-', 'bg-') || 'bg-gray-400'}`} />
                          <span className={`text-xs ${LANGUAGE_COLORS[lang] || 'text-gray-400'}`}>{lang}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${status.ring}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      <span className={status.text}>{status.label}</span>
                    </span>
                  </div>

                  {/* GitHub repo link */}
                  {project.github_repo ? (
                    <a
                      href={`https://github.com/${project.github_repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-blue-400 transition-colors w-fit"
                    >
                      <ExternalLink className="w-3 h-3" />
                      github.com/{project.github_repo}
                    </a>
                  ) : (
                    <span className="text-[11px] text-gray-600">Local repository</span>
                  )}

                  {/* 4-cell real metrics grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium mb-0.5">Environment</p>
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${ENV_COLORS[env] || 'bg-gray-500/20 text-gray-300'}`}>
                        {env}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium mb-0.5">Branch</p>
                      <div className="flex items-center gap-1 text-gray-300 font-medium">
                        <GitBranch className="w-3 h-3 text-gray-500" />
                        {branch}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium mb-0.5">Scans & Vulns</p>
                      <div className="flex items-center gap-1.5 text-gray-200 font-medium">
                        <Shield className="w-3 h-3 text-blue-400" />
                        <span>{scansCount} scans</span>
                        {openVulnsCount > 0 && (
                          <span className="text-rose-400 text-[10px] bg-rose-500/10 px-1 rounded border border-rose-500/20">
                            {openVulnsCount} open
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium mb-0.5">Last Activity</p>
                      <div className="flex items-center gap-1 text-gray-300">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {lastActivity}
                      </div>
                    </div>
                  </div>

                  {/* Real Security / Health bar */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-gray-500 uppercase tracking-wider font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Security Score
                      </span>
                      <span className={`font-bold ${healthScore >= 80 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {hasScan ? `${healthScore}%` : (scansCount > 0 ? `${healthScore}%` : 'N/A')}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${hasScan || scansCount > 0 ? healthColor(healthScore) : 'bg-gray-600'}`}
                        style={{ width: `${hasScan || scansCount > 0 ? healthScore : 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-600">
              <FolderGit2 className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-base font-medium">
                {search ? 'No projects match your search' : 'No projects yet'}
              </p>
              {!search && (
                <p className="text-sm mt-1 text-gray-700">Create your first project to get started</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
