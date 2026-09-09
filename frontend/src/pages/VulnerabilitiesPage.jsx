import { useState, useEffect, useCallback } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  Check,
  Ban,
  RotateCcw,
  Code,
  Search,
  RefreshCw,
  Clock,
  FileCode,
  History,
  Lightbulb,
  ExternalLink
} from 'lucide-react'
import { fetchVulnerabilities, fetchVulnerability, updateVulnerability } from '../api/client'
import Header from '../components/layout/Header'

const SEVERITY_BADGES = {
  critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  info:     'bg-gray-500/10 text-gray-400 border-gray-500/20'
}

const SCANNER_BADGES = {
  brakeman:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  semgrep:       'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  bundler_audit: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  npm_audit:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  gitleaks:      'bg-rose-500/10 text-rose-400 border-rose-500/20'
}

const TYPE_BADGES = {
  sast:       'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  dependency: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  secret:     'bg-rose-500/10 text-rose-400 border-rose-500/20',
  container:  'bg-blue-500/10 text-blue-400 border-blue-500/20'
}

export default function VulnerabilitiesPage() {
  const [vulnerabilities, setVulnerabilities] = useState([])
  const [selectedVuln, setSelectedVuln] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('open')
  const [scannerFilter, setScannerFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)
  const [actionModal, setActionModal] = useState(null) // { type: 'resolve'|'ignore'|'reopen', vuln }
  const [actionReason, setActionReason] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = {}
    if (severityFilter !== 'all') params.severity = severityFilter
    if (statusFilter !== 'all') params.status = statusFilter
    if (scannerFilter !== 'all') params.scanner = scannerFilter
    if (typeFilter !== 'all') params.scan_type = typeFilter
    if (searchQuery.trim()) params.query = searchQuery.trim()

    fetchVulnerabilities(params)
      .then(res => {
        const list = res.data?.data || []
        setVulnerabilities(list)
        setMeta(res.data?.meta || null)
        if (list.length > 0 && (!selectedVuln || !list.some(v => v.id === selectedVuln.id))) {
          loadDetail(list[0].id)
        } else if (list.length === 0) {
          setSelectedVuln(null)
        }
      })
      .catch(err => {
        setError(err?.response?.data?.error || 'Failed to load vulnerabilities')
        setVulnerabilities([])
        setSelectedVuln(null)
      })
      .finally(() => setLoading(false))
  }, [severityFilter, statusFilter, scannerFilter, typeFilter, searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadDetail = (id) => {
    setDetailLoading(true)
    fetchVulnerability(id)
      .then(res => setSelectedVuln(res.data?.data || res.data))
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }

  const handleTriageAction = async (status, reason) => {
    if (!actionModal?.vuln) return
    setActionSubmitting(true)
    try {
      const res = await updateVulnerability(actionModal.vuln.id, { status, reason })
      const updated = res.data?.data || res.data
      setVulnerabilities(prev => prev.map(v => v.id === updated.id ? { ...v, status: updated.status } : v))
      if (selectedVuln?.id === updated.id) {
        setSelectedVuln(updated)
      }
      setActionModal(null)
      setActionReason('')
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update vulnerability state')
    } finally {
      setActionSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      <Header
        title="Vulnerabilities & Findings"
        subtitle="Security flaws, SCA dependencies, and hardcoded secrets across all monitored repositories"
      />

      {/* Meta Statistics Cards */}
      {meta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-4">
            <div className="text-gray-400 text-xs uppercase font-medium">Total Open</div>
            <div className="text-2xl font-bold text-white mt-1">{meta.open}</div>
          </div>
          <div className="bg-[#111726] border border-rose-500/20 rounded-xl p-4">
            <div className="text-rose-400 text-xs uppercase font-medium">Critical</div>
            <div className="text-2xl font-bold text-rose-400 mt-1">{meta.by_severity?.critical || 0}</div>
          </div>
          <div className="bg-[#111726] border border-orange-500/20 rounded-xl p-4">
            <div className="text-orange-400 text-xs uppercase font-medium">High</div>
            <div className="text-2xl font-bold text-orange-400 mt-1">{meta.by_severity?.high || 0}</div>
          </div>
          <div className="bg-[#111726] border border-yellow-500/20 rounded-xl p-4">
            <div className="text-yellow-400 text-xs uppercase font-medium">Medium</div>
            <div className="text-2xl font-bold text-yellow-400 mt-1">{meta.by_severity?.medium || 0}</div>
          </div>
          <div className="bg-[#111726] border border-emerald-500/20 rounded-xl p-4">
            <div className="text-emerald-400 text-xs uppercase font-medium">Resolved</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{meta.resolved || 0}</div>
          </div>
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-4">
            <div className="text-gray-400 text-xs uppercase font-medium">Ignored (FP)</div>
            <div className="text-2xl font-bold text-gray-300 mt-1">{meta.ignored || 0}</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search file, message, rule ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[#0B0F17] border border-[#1E293B] rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Severity */}
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="bg-[#0B0F17] border border-[#1E293B] text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#0B0F17] border border-[#1E293B] text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="reopened">Reopened</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored (FP)</option>
        </select>

        {/* Scanner */}
        <select
          value={scannerFilter}
          onChange={e => setScannerFilter(e.target.value)}
          className="bg-[#0B0F17] border border-[#1E293B] text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Scanners</option>
          <option value="brakeman">Brakeman (Ruby SAST)</option>
          <option value="semgrep">Semgrep (AST SAST)</option>
          <option value="bundler_audit">Bundler Audit (Ruby SCA)</option>
          <option value="npm_audit">npm Audit (JS/TS SCA)</option>
          <option value="gitleaks">Gitleaks (Secrets)</option>
        </select>

        {/* Scan Type */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#0B0F17] border border-[#1E293B] text-gray-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Finding Types</option>
          <option value="sast">SAST (Code Analysis)</option>
          <option value="dependency">Dependency (SCA)</option>
          <option value="secret">Secret / Credentials</option>
        </select>

        <button
          onClick={loadData}
          className="p-2 text-gray-400 hover:text-white bg-[#0B0F17] border border-[#1E293B] rounded-lg hover:border-slate-700 transition-colors"
          title="Refresh findings"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Content: List + Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Finding List */}
        <div className="lg:col-span-6 space-y-3">
          {loading && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-8 text-center text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
              <p className="text-sm">Scanning & loading findings...</p>
            </div>
          )}

          {error && (
            <div className="bg-[#111726] border border-rose-500/30 rounded-xl p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-rose-300">{error}</p>
              <button
                onClick={loadData}
                className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && vulnerabilities.length === 0 && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-12 text-center text-gray-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
              <p className="text-base font-semibold text-gray-300">No vulnerabilities found</p>
              <p className="text-xs text-gray-500 mt-1">All scanned code matches current security policies and filters.</p>
            </div>
          )}

          {!loading && vulnerabilities.map(v => {
            const isSelected = selectedVuln?.id === v.id
            const sevBadge = SEVERITY_BADGES[v.severity] || SEVERITY_BADGES.info
            const scannerBadge = SCANNER_BADGES[v.scanner] || 'bg-slate-700/20 text-gray-400'
            const typeBadge = TYPE_BADGES[v.scan_type] || 'bg-slate-700/20 text-gray-400'

            return (
              <div
                key={v.id}
                onClick={() => loadDetail(v.id)}
                className={`bg-[#111726] border rounded-xl p-4 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-blue-500 shadow-lg shadow-blue-500/10'
                    : 'border-[#1E293B] hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${sevBadge}`}>
                        {v.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${scannerBadge}`}>
                        {v.scanner || 'SAST'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${typeBadge}`}>
                        {v.scan_type || 'code'}
                      </span>
                      {v.status !== 'open' && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                          v.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                          v.status === 'ignored' ? 'bg-gray-500/10 text-gray-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {v.status}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{v.warning_type}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{v.message}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-gray-500 font-mono">
                  <span className="truncate max-w-[300px]" title={v.file}>
                    {v.file}{v.line ? `:${v.line}` : ''}
                  </span>
                  <span>Scan #{v.scan_id}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column: Deep Detail & Triage Console */}
        <div className="lg:col-span-6">
          {detailLoading && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-12 text-center text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
              <p className="text-sm">Loading finding details & history...</p>
            </div>
          )}

          {!detailLoading && !selectedVuln && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-12 text-center text-gray-500">
              <FileCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a vulnerability from the list to view AST details, remediation, and lifecycle history.</p>
            </div>
          )}

          {!detailLoading && selectedVuln && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 space-y-6 sticky top-6">
              {/* Top Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${SEVERITY_BADGES[selectedVuln.severity] || 'border-gray-500'}`}>
                      {selectedVuln.severity}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded font-mono">
                      {selectedVuln.check_name || selectedVuln.warning_type}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                    selectedVuln.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' :
                    selectedVuln.status === 'ignored' ? 'bg-gray-500/20 text-gray-300' :
                    selectedVuln.status === 'reopened' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {selectedVuln.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedVuln.warning_type}</h2>
                <p className="text-sm text-gray-300">{selectedVuln.message}</p>
              </div>

              {/* Triage Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#1E293B]">
                {selectedVuln.status !== 'resolved' && (
                  <button
                    onClick={() => setActionModal({ type: 'resolve', vuln: selectedVuln })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark Resolved
                  </button>
                )}
                {selectedVuln.status !== 'ignored' && (
                  <button
                    onClick={() => setActionModal({ type: 'ignore', vuln: selectedVuln })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" /> Ignore (False Positive)
                  </button>
                )}
                {selectedVuln.status !== 'open' && (
                  <button
                    onClick={() => handleTriageAction('open', 'Manually reopened')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reopen
                  </button>
                )}
              </div>

              {/* Location & Code Snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                  <span>Affected File & Context</span>
                  <span className="font-mono text-gray-500">
                    {selectedVuln.file}{selectedVuln.line ? `:${selectedVuln.line}` : ''}
                  </span>
                </div>
                {selectedVuln.code ? (
                  <div className="bg-[#0B0F17] border border-[#1E293B] rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre">
                    <code>{selectedVuln.code}</code>
                  </div>
                ) : (
                  <div className="bg-[#0B0F17] border border-[#1E293B] rounded-lg p-3 text-xs text-gray-500 italic">
                    No inline code snippet available for this finding.
                  </div>
                )}
              </div>

              {/* Remediation Guidance */}
              {selectedVuln.remediation && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4" /> Recommended Remediation
                  </div>
                  <p className="text-xs text-blue-200 whitespace-pre-line leading-relaxed">
                    {selectedVuln.remediation}
                  </p>
                </div>
              )}

              {/* Fingerprint & Identifiers */}
              <div className="space-y-1.5 text-xs">
                <div className="text-gray-400 font-medium">Deterministic Fingerprint (GR-201 / GR-304)</div>
                <div className="bg-[#0B0F17] border border-[#1E293B] rounded px-2.5 py-1.5 font-mono text-[11px] text-gray-400 break-all select-all">
                  {selectedVuln.fingerprint}
                </div>
              </div>

              {/* Lifecycle History Timeline */}
              {selectedVuln.lifecycle_history?.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-[#1E293B]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <History className="w-3.5 h-3.5" /> Lifecycle Audit History
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedVuln.lifecycle_history.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-[#0B0F17] border border-[#1E293B] rounded p-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                            item.status === 'ignored' ? 'bg-gray-500/10 text-gray-400' :
                            item.status === 'reopened' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {item.status}
                          </span>
                          <span className="text-gray-300 font-mono">Scan #{item.scan_id}</span>
                          {item.commit_sha && (
                            <span className="text-gray-500 font-mono text-[10px]">({item.commit_sha.slice(0, 7)})</span>
                          )}
                        </div>
                        <span className="text-gray-500 text-[11px]">
                          {item.scanned_at ? new Date(item.scanned_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal for Reason Input */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {actionModal.type === 'resolve' ? 'Resolve Vulnerability' : 'Ignore as False Positive'}
            </h3>
            <p className="text-xs text-gray-400">
              {actionModal.type === 'resolve'
                ? 'Specify how this vulnerability was addressed (e.g. patched in commit abc, input validated).'
                : 'Provide justification for ignoring this security finding so it carries forward in future scans.'}
            </p>
            <textarea
              rows="3"
              placeholder="Enter resolution notes / rationale..."
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-transparent rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={actionSubmitting}
                onClick={() => handleTriageAction(actionModal.type === 'resolve' ? 'resolved' : 'ignored', actionReason)}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors ${
                  actionModal.type === 'resolve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {actionSubmitting ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
