import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ChevronLeft,
  Eye,
  GitBranch,
  Clock,
  Hash,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { fetchWebhookEvents } from '../api/client'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [expandedEvent, setExpandedEvent] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [showEventDropdown, setShowEventDropdown] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 })
  const perPage = 10

  // Fetch real webhook events directly from Rails API
  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)

    try {
      const params = {
        page,
        per_page: perPage
      }
      if (statusFilter !== 'all') params.status = statusFilter
      if (eventTypeFilter !== 'all') params.event_type = eventTypeFilter
      if (search.trim()) params.search = search.trim()

      const res = await fetchWebhookEvents(params)
      const data = res.data?.data || []
      const pag = res.data?.pagination || { page: 1, per_page: perPage, total: data.length, total_pages: 1 }

      setEvents(data)
      setPagination(pag)
    } catch (err) {
      console.error('Failed to load real webhook events:', err)
      setError(err.response?.data?.error || err.message || 'Failed to load webhook events')
      setEvents([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, statusFilter, eventTypeFilter, search])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleRefresh = () => {
    setRefreshing(true)
    loadEvents(true)
  }

  const handleCopyPayload = (id, payload) => {
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const totalPages = pagination.total_pages || Math.max(1, Math.ceil((pagination.total || 0) / perPage))

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Webhook Events</h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              100% Real Data
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real incoming event delivery log and signature verification audits from PostgreSQL
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E293B] bg-[#111726] hover:bg-[#1E293B] text-xs text-gray-300 transition-colors"
          title="Refresh Events"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : 'text-gray-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadEvents()}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by repo, event, delivery ID..."
              className="w-full bg-[#111726] border border-[#1E293B] rounded-xl pl-9 pr-3.5 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1 bg-[#111726] border border-[#1E293B] p-1 rounded-xl">
            {['all', 'success', 'failed', 'pending'].map((status) => {
              const active = statusFilter === status
              return (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setPage(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                    active
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#1E293B]'
                  }`}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              )
            })}
          </div>
        </div>

        {/* Event Type Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowEventDropdown(!showEventDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1E293B] bg-[#111726] hover:border-gray-600 text-xs text-gray-300 transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="capitalize">
              {eventTypeFilter === 'all' ? 'Event type' : eventTypeFilter}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {showEventDropdown && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-[#1E293B] bg-[#111726] shadow-xl py-1 z-30">
              {['all', 'push', 'pull_request', 'workflow_run', 'workflow_job', 'check_suite', 'check_run', 'issues', 'ping'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setEventTypeFilter(type)
                    setShowEventDropdown(false)
                    setPage(1)
                  }}
                  className={`w-full text-left px-3.5 py-1.5 text-xs capitalize hover:bg-[#1E293B] transition-colors ${
                    eventTypeFilter === type ? 'text-blue-400 font-semibold bg-blue-500/10' : 'text-gray-300'
                  }`}
                >
                  {type === 'all' ? 'All Event Types' : type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Events Table Container */}
      <div className="rounded-xl border border-[#1E293B] bg-[#111726] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#0E131F]/60 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                <th className="w-8 px-4 py-3"></th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Delivery ID</th>
                <th className="px-4 py-3">Repository</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                      <p className="text-xs">Loading real webhook delivery logs from database...</p>
                    </div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-gray-500" />
                      <p className="text-sm font-medium text-gray-300">No real webhook events found</p>
                      <p className="text-xs text-gray-500">
                        {statusFilter !== 'all' || eventTypeFilter !== 'all' || search
                          ? 'No events match the selected filters. Try clearing your search.'
                          : 'No webhook events have been recorded yet in the database.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const isExpanded = expandedEvent === event.id
                  const status = (event.status || 'success').toLowerCase()

                  return (
                    <>
                      <tr
                        key={event.id}
                        onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                        className={`hover:bg-[#1E293B]/40 transition-colors cursor-pointer group ${
                          isExpanded ? 'bg-[#1E293B]/30' : ''
                        }`}
                      >
                        {/* Expand/Collapse Chevron */}
                        <td className="w-8 px-4 py-3 text-gray-500 group-hover:text-gray-300">
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-blue-400' : ''
                            }`}
                          />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {status === 'success' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Success
                            </span>
                          )}
                          {status === 'failed' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              Failed
                            </span>
                          )}
                          {status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Delivery ID */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                          <div className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                            <Hash className="w-3 h-3 text-gray-500" />
                            <span title={event.delivery_id}>
                              {event.delivery_id ? `# ${event.delivery_id.slice(0, 16)}...` : `# event-${event.id}`}
                            </span>
                          </div>
                        </td>

                        {/* Repository */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-gray-200 font-medium">
                            <GitBranch className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{event.repository || 'unknown/repo'}</span>
                          </div>
                        </td>

                        {/* Event */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1E293B] text-gray-300 border border-[#334155]/40">
                            {event.event || 'push'}
                          </span>
                        </td>

                        {/* Branch */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-400">
                          <code>{event.branch || 'main'}</code>
                        </td>

                        {/* Created At */}
                        <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span>
                              {event.created_at
                                ? new Date(event.created_at).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false
                                  })
                                : '—'}
                            </span>
                          </div>
                        </td>

                        {/* Payload Action Button */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedEvent(isExpanded ? null : event.id)
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                              isExpanded
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-[#1E293B]'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Payload</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Payload Viewer */}
                      {isExpanded && (
                        <tr key={`${event.id}-payload`}>
                          <td colSpan={8} className="px-4 py-3 bg-[#0A0E1A]/80 border-b border-[#1E293B]">
                            <div className="rounded-xl border border-[#1E293B] bg-[#0E1322] overflow-hidden">
                              {/* Payload Header */}
                              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E293B] bg-[#111726]">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-200">
                                    Payload — {event.delivery_id || `event-${event.id}`}
                                  </span>
                                  {event.error_message && (
                                    <span className="text-[11px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                      {event.error_message}
                                    </span>
                                  )}
                                  {event.scan_id && (
                                    <span className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                      Scan #{event.scan_id}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleCopyPayload(event.id, event.payload)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#1E293B] hover:bg-[#2A374F] text-gray-300 transition-colors"
                                >
                                  {copiedId === event.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-gray-400" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* JSON Viewer */}
                              <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96 leading-relaxed select-text">
                                <code>
                                  {JSON.stringify(event.payload || {}, null, 2)}
                                </code>
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-[#1E293B] px-4 py-3 text-xs text-gray-400 bg-[#0E131F]/40">
          <div>
            Showing {pagination.total === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, pagination.total || events.length)} of {pagination.total || events.length} events
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1E293B] text-gray-400 hover:text-white hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  page === p
                    ? 'bg-blue-500 text-white'
                    : 'border border-[#1E293B] text-gray-400 hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1E293B] text-gray-400 hover:text-white hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
