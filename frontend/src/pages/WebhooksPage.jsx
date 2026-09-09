import { useState, useEffect } from 'react'
import {
  Webhook,
  CheckCircle2,
  Activity,
  Clock,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  GitBranch,
  X
} from 'lucide-react'
import { fetchWebhooks, createWebhook, deleteWebhook, fetchProjects } from '../api/client'

export default function WebhooksPage() {
  const [copiedId, setCopiedId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [webhooks, setWebhooks] = useState([])
  const [meta, setMeta] = useState({ total_webhooks: 0, active_webhooks: 0, total_deliveries: 0, avg_response: '—' })
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])

  const [newHook, setNewHook] = useState({
    name: '',
    project_id: null,
    events: ['push', 'pull_request']
  })

  const loadWebhooks = () => {
    setLoading(true)
    fetchWebhooks()
      .then(res => {
        const list = res.data?.data || []
        setWebhooks(list)
        if (res.data?.meta) {
          setMeta(res.data.meta)
        }
      })
      .catch(err => {
        console.error('Failed to load webhooks:', err)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadWebhooks()

    // Real user projects to attach the webhook to (backend resolves the repo from the project)
    fetchProjects()
      .then(res => {
        const list = res.data?.data || res.data || []
        setProjects(list)
        if (list.length > 0) {
          setNewHook(h => (h.project_id ? h : { ...h, project_id: list[0].id }))
        }
      })
      .catch(() => {})
  }, [])

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (id) => {
    deleteWebhook(id)
      .then(() => loadWebhooks())
      .catch(() => {
        setWebhooks(prev => prev.filter(w => w.id !== id))
      })
  }

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newHook.project_id) return
    createWebhook({
      project_id: newHook.project_id,
      name: newHook.name,
      events: newHook.events
    })
      .then(() => {
        setShowCreateModal(false)
        setNewHook({ name: '', project_id: projects[0]?.id ?? null, events: ['push', 'pull_request'] })
        loadWebhooks()
      })
      .catch(err => {
        alert(err?.response?.data?.error || 'Failed to create webhook')
      })
  }

  const filtered = webhooks.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.repo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeCount = meta.active_webhooks || webhooks.filter(w => w.status === 'Active').length
  const totalDeliveries = (meta.total_deliveries || webhooks.reduce((acc, w) => acc + (w.deliveries || 0), 0)).toLocaleString()

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Webhooks</h1>
          <p className="text-gray-400 text-xs mt-0.5">Manage incoming GitHub webhooks</p>
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
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Webhook</span>
          </button>
        </div>
      </div>

      {/* 4 Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Webhooks */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs text-gray-400 font-medium">Total Webhooks</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Webhook className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight mt-3">{meta.total_webhooks || webhooks.length}</div>
        </div>

        {/* Card 2: Active Webhooks */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs text-gray-400 font-medium">Active Webhooks</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight mt-3">{activeCount}</div>
        </div>

        {/* Card 3: Total Deliveries */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs text-gray-400 font-medium">Total Deliveries</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight mt-3">{totalDeliveries}</div>
        </div>

        {/* Card 4: Avg. Response */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs text-gray-400 font-medium">Avg. Response</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight mt-3">{meta.avg_response || '—'}</div>
        </div>
      </div>

      {/* Webhooks Stacked Cards */}
      <div className="space-y-4">
        {loading && webhooks.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-[#111726] rounded-xl border border-[#1E293B] animate-pulse">
            Loading configured webhooks from database...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-[#111726] rounded-xl border border-[#1E293B]">
            No webhooks configured yet. Click "+ Create Webhook" to set up an automated pipeline trigger.
          </div>
        ) : (
          filtered.map(hook => (
            <div
              key={hook.id}
              className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5"
            >
              {/* Top row of card */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-blue-400">
                    <Webhook className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm">{hook.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        hook.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hook.status === 'Active' ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                        {hook.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <GitBranch className="w-3 h-3 text-gray-600" />
                      <span>{hook.repo}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(hook.id)}
                  className="text-gray-600 hover:text-rose-400 transition-colors p-1"
                  title="Delete Webhook"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* URL Input Box */}
              <div className="mt-4 flex items-center justify-between bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2">
                <code className="text-xs font-mono text-gray-400 truncate max-w-[85%]">
                  {hook.url}
                </code>
                <button
                  onClick={() => handleCopy(hook.id, hook.url)}
                  className="text-gray-500 hover:text-white transition-colors"
                  title="Copy URL"
                >
                  {copiedId === hook.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Bottom Row */}
              <div className="mt-4 pt-3 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Event Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(hook.events || ['push', 'pull_request']).map(ev => (
                    <span
                      key={ev}
                      className="bg-[#0B0F19] text-gray-400 border border-[#1E293B] px-2 py-0.5 rounded text-[11px] font-mono"
                    >
                      {ev}
                    </span>
                  ))}
                </div>

                {/* Delivery Stats */}
                <div className="flex items-center gap-3 text-gray-500 text-[11px]">
                  <span>{(hook.deliveries || 0).toLocaleString()} deliveries</span>
                  {hook.failures > 0 && (
                    <span className="text-rose-400 font-medium">{hook.failures} failures</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-600" />
                    <span>{hook.last_active || 'active'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-bold text-white">Create New Webhook</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Webhook Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Deployment Webhook"
                  value={newHook.name}
                  onChange={e => setNewHook({ ...newHook, name: e.target.value })}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Target Repository</label>
                {projects.length === 0 ? (
                  <p className="text-xs text-gray-500 bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2">
                    No projects available — create a project first.
                  </p>
                ) : (
                  <select
                    value={newHook.project_id ?? ''}
                    onChange={e => setNewHook({ ...newHook, project_id: parseInt(e.target.value) })}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.github_repo || p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Subscribed Events</label>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  {['push', 'pull_request', 'workflow_run', 'release'].map(ev => (
                    <label key={ev} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newHook.events.includes(ev)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewHook({ ...newHook, events: [...newHook.events, ev] })
                          } else {
                            setNewHook({ ...newHook, events: newHook.events.filter(x => x !== ev) })
                          }
                        }}
                        className="rounded border-[#1E293B] text-blue-600 focus:ring-blue-500"
                      />
                      <span>{ev}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
                >
                  Save Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
