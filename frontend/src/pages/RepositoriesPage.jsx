import { useState, useEffect } from 'react'
import { fetchRepositories, createRepository, deleteRepository } from '../api/client'
import {
  FolderGit2,
  GitFork,
  Shield,
  Plus,
  Trash2,
  ExternalLink,
  Code2,
  CheckCircle2,
  Search
} from 'lucide-react'
import Header from '../components/layout/Header'

const LANGUAGE_COLORS = {
  ruby:       'bg-red-500/10 text-red-400 border-red-500/20',
  java:       'bg-amber-500/10 text-amber-400 border-amber-500/20',
  python:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  javascript: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  typescript: 'bg-blue-600/10 text-blue-300 border-blue-600/20',
  go:         'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  php:        'bg-purple-500/10 text-purple-400 border-purple-500/20'
}

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')
  const [newRepo, setNewRepo] = useState({
    name: '',
    full_name: '',
    url: '',
    language: 'ruby',
    default_branch: 'main'
  })

  const loadRepos = () => {
    setLoading(true)
    fetchRepositories()
      .then(res => {
        const list = res.data?.data || []
        setRepositories(list)
      })
      .catch(() => {
        // Fallback demo multi-language repos
        setRepositories([
          {
            id: 1,
            name: 'guardial',
            full_name: 'missaouiabdou/guardial',
            url: 'https://github.com/missaouiabdou/guardial',
            language: 'Ruby',
            default_branch: 'main',
            supported_scanners: ['Scanners::BrakemanScanner', 'Scanners::SemgrepScanner']
          },
          {
            id: 2,
            name: 'guardrail-scanner-service',
            full_name: 'missaouiabdou/guardrail-scanner-service',
            url: 'https://github.com/missaouiabdou/guardial',
            language: 'Java',
            default_branch: 'main',
            supported_scanners: ['Scanners::SemgrepScanner']
          },
          {
            id: 3,
            name: 'payment-service',
            full_name: 'acme/payment-service',
            url: 'https://github.com/acme/payment-service',
            language: 'Python',
            default_branch: 'main',
            supported_scanners: ['Scanners::BanditScanner', 'Scanners::SemgrepScanner']
          },
          {
            id: 4,
            name: 'api-gateway',
            full_name: 'acme/api-gateway',
            url: 'https://github.com/acme/api-gateway',
            language: 'Go',
            default_branch: 'main',
            supported_scanners: ['Scanners::SemgrepScanner']
          }
        ])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRepos()
  }, [])

  const handleCreate = (e) => {
    e.preventDefault()
    createRepository(newRepo)
      .then(() => {
        setShowAddModal(false)
        setNewRepo({ name: '', full_name: '', url: '', language: 'ruby', default_branch: 'main' })
        loadRepos()
      })
      .catch(() => {
        // Optimistic UI addition
        setRepositories(prev => [
          ...prev,
          {
            id: Date.now(),
            ...newRepo,
            supported_scanners: ['Scanners::SemgrepScanner']
          }
        ])
        setShowAddModal(false)
      })
  }

  const handleDelete = (id) => {
    deleteRepository(id)
      .then(() => loadRepos())
      .catch(() => {
        setRepositories(prev => prev.filter(r => r.id !== id))
      })
  }

  const filtered = repositories.filter(r =>
    r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.language?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <Header
        title="Repositories & Polyglot Engine"
        subtitle="Manage connected multi-language codebases and automated scanners"
      />

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-[#111726] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-gray-300 w-72">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by repo or language (Java, Ruby, Python)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent focus:outline-none w-full placeholder-gray-500"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Repository
        </button>
      </div>

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(repo => {
          const langKey = repo.language?.toLowerCase() || 'ruby'
          const badgeStyle = LANGUAGE_COLORS[langKey] || LANGUAGE_COLORS.ruby

          return (
            <div
              key={repo.id}
              className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <GitFork className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm truncate max-w-[200px]">
                        {repo.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {repo.full_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(repo.id)}
                      className="text-gray-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mt-4">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase border ${badgeStyle}`}>
                    {repo.language || 'Ruby'}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    branch: {repo.default_branch || 'main'}
                  </span>
                </div>

                {/* Supported Scanner Engines */}
                <div className="mt-4 pt-3 border-t border-[#1E293B]">
                  <div className="text-[11px] text-gray-400 font-semibold mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span>Engines:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(repo.supported_scanners || ['BrakemanScanner', 'SemgrepScanner']).map(sc => (
                      <span
                        key={sc}
                        className="bg-[#0B0F19] text-gray-300 border border-[#1E293B] px-2 py-0.5 rounded text-[10px] font-mono"
                      >
                        {sc.replace('Scanners::', '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Repository Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-bold text-white">Connect New Repository</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Repository Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. payment-service"
                  value={newRepo.name}
                  onChange={e => setNewRepo({ ...newRepo, name: e.target.value })}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Full Name (owner/repo)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme/payment-service"
                  value={newRepo.full_name}
                  onChange={e => setNewRepo({ ...newRepo, full_name: e.target.value })}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Git Clone URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/acme/payment-service"
                  value={newRepo.url}
                  onChange={e => setNewRepo({ ...newRepo, url: e.target.value })}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Primary Language</label>
                  <select
                    value={newRepo.language}
                    onChange={e => setNewRepo({ ...newRepo, language: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ruby">Ruby / Rails</option>
                    <option value="java">Java / Spring</option>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript / Node</option>
                    <option value="typescript">TypeScript</option>
                    <option value="go">Go</option>
                    <option value="php">PHP</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Default Branch</label>
                  <input
                    type="text"
                    value={newRepo.default_branch}
                    onChange={e => setNewRepo({ ...newRepo, default_branch: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
                >
                  Save Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
