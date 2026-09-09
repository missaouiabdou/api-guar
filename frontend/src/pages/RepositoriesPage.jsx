import { useState, useEffect } from 'react'
import {
  GitFork,
  GitBranch,
  Star,
  Eye,
  Plus,
  Search,
  ExternalLink,
  User,
  Clock,
  AlertTriangle,
  X,
  Trash2
} from 'lucide-react'
import { fetchRepositories, createRepository, deleteRepository } from '../api/client'

const LANG_COLORS = {
  Go: 'bg-cyan-400',
  TypeScript: 'bg-blue-400',
  Rust: 'bg-orange-500',
  Python: 'bg-yellow-400',
  'Node.js': 'bg-emerald-400',
  Ruby: 'bg-red-400'
}

export default function RepositoriesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showConnectModal, setShowConnectModal] = useState(false)

  const [repos, setRepos] = useState([])
  const [commits, setCommits] = useState([])
  const [pullRequests, setPullRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [newRepoForm, setNewRepoForm] = useState({
    name: '',
    full_name: '',
    url: '',
    language: 'Go',
    isPrivate: false
  })

  const loadData = () => {
    setLoading(true)
    fetchRepositories()
      .then(res => {
        const backendRepos = res.data?.data || []
        const mappedRepos = backendRepos.map(br => ({
          id: br.id,
          name: br.full_name || br.name,
          description: br.metadata?.description || `Automated security scanner active for ${br.language || 'codebase'}`,
          webhookStatus: br.webhook_status || (br.active ? 'Active' : 'Inactive'),
          isPrivate: br.metadata?.is_private || false,
          language: br.language || 'Ruby',
          stars: br.stars ?? 0,
          forks: br.forks ?? 0,
          watchers: br.watchers ?? 0,
          updatedAt: br.updated_at || '—',
          openPRs: br.open_prs ?? 0
        }))
        setRepos(mappedRepos)
        if (res.data?.commits) setCommits(res.data.commits)
        if (res.data?.pull_requests) setPullRequests(res.data.pull_requests)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleConnect = (e) => {
    e.preventDefault()
    createRepository(newRepoForm)
      .then(() => {
        setShowConnectModal(false)
        setNewRepoForm({ name: '', full_name: '', url: '', language: 'Go', isPrivate: false })
        loadData()
      })
      .catch(err => {
        alert(err?.response?.data?.errors?.join(', ') || 'Failed to connect repository')
      })
  }

  const handleDelete = (id) => {
    deleteRepository(id)
      .then(() => loadData())
      .catch(() => {})
  }

  const filtered = repos.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.language.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Repositories</h1>
          <p className="text-gray-400 text-xs mt-0.5">Connected GitHub repositories</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-[#111726] border border-[#1E293B] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 border border-[#1E293B] px-1 rounded bg-[#0B0F19]">
              ⌘K
            </span>
          </div>

          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Repository</span>
          </button>
        </div>
      </div>

      {/* Section Title */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          CONNECTED REPOSITORIES ({repos.length})
        </h2>
      </div>

      {/* Repositories 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading && repos.length === 0 ? (
          <div className="col-span-1 lg:col-span-2 p-12 text-center text-gray-500 bg-[#111726] rounded-xl border border-[#1E293B] animate-pulse">
            Connecting to GitHub repositories...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-1 lg:col-span-2 p-12 text-center text-gray-500 bg-[#111726] rounded-xl border border-[#1E293B]">
            No repositories found. Click "+ Connect Repository" to link a codebase.
          </div>
        ) : (
          filtered.map(repo => {
            const langDot = LANG_COLORS[repo.language] || 'bg-blue-400'
            const isActive = repo.webhookStatus === 'Active'

          return (
            <div
              key={repo.id}
              className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Icon, Title, Private Badge, Webhook Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-gray-400">
                      <GitFork className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{repo.name}</h3>
                        {repo.isPrivate && (
                          <span className="text-[10px] bg-[#0B0F19] border border-[#1E293B] text-gray-400 px-1.5 py-0.2 rounded font-medium">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{repo.description}</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {isActive ? 'Webhook Active' : 'Webhook Error'}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Language, Stats, Time, Open PRs */}
              <div className="mt-4 pt-3 border-t border-[#1E293B]/70 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-4">
                  {/* Language */}
                  <div className="flex items-center gap-1.5 font-medium text-gray-300">
                    <span className={`w-2 h-2 rounded-full ${langDot}`} />
                    <span>{repo.language}</span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-gray-500" />
                    <span>{repo.stars}</span>
                  </div>

                  {/* Forks */}
                  <div className="flex items-center gap-1">
                    <GitFork className="w-3.5 h-3.5 text-gray-500" />
                    <span>{repo.forks}</span>
                  </div>

                  {/* Watchers */}
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                    <span>{repo.watchers}</span>
                  </div>

                  {/* Updated At */}
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3 text-gray-600" />
                    <span>{repo.updatedAt}</span>
                  </div>
                </div>

                {/* Open PRs */}
                {repo.openPRs > 0 && (
                  <div className="flex items-center gap-1 text-amber-400 font-medium">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>{repo.openPRs} open PRs</span>
                  </div>
                )}
              </div>
            </div>
          )
        }))}
      </div>

      {/* Bottom Row: Latest Commits & Open Pull Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Column 1: Latest Commits */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Latest Commits</h3>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>

          <div className="space-y-3">
            {commits.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-8 border border-dashed border-[#1E293B] rounded-lg">
                No commits found. Repositories must exist on GitHub to display real commit activity.
              </div>
            ) : commits.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#0B0F19] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-gray-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{c.message}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      <span className="text-blue-400 font-mono font-medium">{c.sha}</span>
                      <span className="mx-1.5">&bull;</span>
                      <span>{c.author}</span>
                      <span className="mx-1.5">&bull;</span>
                      <span>{c.time}</span>
                    </div>
                  </div>
                </div>

                <span className="text-xs text-gray-400 font-mono">{c.repo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Open Pull Requests */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Open Pull Requests</h3>
            <span className="text-xs text-gray-500 font-medium">{pullRequests.length} open</span>
          </div>

          <div className="space-y-3">
            {pullRequests.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-8 border border-dashed border-[#1E293B] rounded-lg">
                No open pull requests across connected repositories.
              </div>
            ) : pullRequests.map(pr => (
              <div
                key={pr.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#0B0F19] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{pr.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      <span>#{pr.number}</span>
                      <span className="mx-1.5">{pr.repo}</span>
                      <span className="mx-1">&bull;</span>
                      <span>{pr.author}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {pr.status}
                  </span>
                  <div className="text-[10px] text-gray-500 mt-1">{pr.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connect Repository Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-bold text-white">Connect GitHub Repository</h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Repository Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. payment-service"
                  value={newRepoForm.name}
                  onChange={e => setNewRepoForm({ ...newRepoForm, name: e.target.value })}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Full GitHub Name (owner/repo)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme/payment-service"
                  value={newRepoForm.full_name}
                  onChange={e => setNewRepoForm({ ...newRepoForm, full_name: e.target.value })}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Primary Language</label>
                <select
                  value={newRepoForm.language}
                  onChange={e => setNewRepoForm({ ...newRepoForm, language: e.target.value })}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Go">Go</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="Python">Python</option>
                  <option value="Rust">Rust</option>
                  <option value="Node.js">Node.js</option>
                  <option value="Ruby">Ruby</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={newRepoForm.isPrivate}
                  onChange={e => setNewRepoForm({ ...newRepoForm, isPrivate: e.target.checked })}
                  className="rounded border-[#1E293B] text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPrivate" className="text-xs text-gray-300 cursor-pointer">
                  Mark as Private repository
                </label>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
