import { useState, useEffect, useRef, useCallback } from 'react'
import {
  fetchScans,
  fetchScan,
  fetchProjects,
  triggerScan,
  fetchScanVulnerabilities,
  fetchScanSecurity
} from '../api/client'
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Play,
  GitCommit,
  GitBranch,
  Shield,
  ArrowRight,
  GitCompare,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import Header from '../components/layout/Header'

const STATUS_CONFIG = {
  completed:  { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  failed:     { icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
  pending:    { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  processing: { icon: Loader2,      color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' }
}

export default function ScansPage() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [projects, setProjects] = useState([])

  // Run scan modal state
  const [showRunModal, setShowRunModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [scanBranch, setScanBranch] = useState('main')
  const [scanSubmitting, setScanSubmitting] = useState(false)
  const [scanError, setScanError] = useState(null)

  // Compare scans state
  const [compareModal, setCompareModal] = useState(false)
  const [compareScanA, setCompareScanA] = useState('')
  const [compareScanB, setCompareScanB] = useState('')
  const [diffResult, setDiffResult] = useState(null)
  const [diffLoading, setDiffLoading] = useState(false)

  const pollingRef = useRef(null)

  const loadScans = useCallback(() => {
    fetchScans()
      .then(res => {
        const list = res.data?.data || res.data || []
        setScans(list)
      })
      .catch(err => setError(err?.response?.data?.error || 'Failed to load scans'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadScans()
    fetchProjects().then(res => {
      const list = res.data?.data || res.data || []
      setProjects(list)
      if (list.length > 0) setSelectedProjectId(list[0].id)
    }).catch(() => {})
  }, [loadScans])

  // Poll when any scan is in progress
  useEffect(() => {
    const hasActiveScans = scans.some(s => s.status === 'pending' || s.status === 'processing')
    if (hasActiveScans) {
      pollingRef.current = setTimeout(() => {
        loadScans()
      }, 3000)
    }
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [scans, loadScans])

  const handleTriggerScan = async (e) => {
    e.preventDefault()
    if (!selectedProjectId) return
    setScanSubmitting(true)
    setScanError(null)

    try {
      await triggerScan({
        project_id: selectedProjectId,
        branch: scanBranch || 'main'
      })
      setShowRunModal(false)
      loadScans()
    } catch (err) {
      setScanError(err?.response?.data?.error || 'Failed to trigger scan')
    } finally {
      setScanSubmitting(false)
    }
  }

  const handleCompare = async () => {
    if (!compareScanA || !compareScanB || compareScanA === compareScanB) return
    setDiffLoading(true)
    try {
      const [resA, resB] = await Promise.all([
        fetchScanVulnerabilities(compareScanA),
        fetchScanVulnerabilities(compareScanB)
      ])

      const vulnsA = resA.data?.data || []
      const vulnsB = resB.data?.data || []

      const fpsA = new Map(vulnsA.map(v => [v.fingerprint, v]))
      const fpsB = new Map(vulnsB.map(v => [v.fingerprint, v]))

      const newVulns = []
      const resolvedVulns = []
      const unchangedVulns = []

      // In B but not in A => newly introduced
      for (const [fp, v] of fpsB.entries()) {
        if (!fpsA.has(fp)) {
          newVulns.push(v)
        } else {
          unchangedVulns.push(v)
        }
      }

      // In A but not in B => resolved / eliminated
      for (const [fp, v] of fpsA.entries()) {
        if (!fpsB.has(fp)) {
          resolvedVulns.push(v)
        }
      }

      setDiffResult({
        scanA: scans.find(s => String(s.id) === String(compareScanA)),
        scanB: scans.find(s => String(s.id) === String(compareScanB)),
        newVulns,
        resolvedVulns,
        unchangedVulns
      })
    } catch (err) {
      alert('Failed to compare scans: ' + (err?.message || 'Network error'))
    } finally {
      setDiffLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Header
          title="Security Scans"
          subtitle="Audit pipeline runs, commit status history, and finding diff comparisons"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCompareModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#111726] hover:bg-slate-800 border border-[#1E293B] text-gray-300 text-xs font-semibold rounded-lg transition-colors"
          >
            <GitCompare className="w-4 h-4 text-blue-400" /> Compare Scans
          </button>
          <button
            onClick={() => setShowRunModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-blue-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Trigger New Scan
          </button>
        </div>
      </div>

      {/* Main Scans Table */}
      <div className="bg-[#111726] rounded-xl border border-[#1E293B] overflow-hidden">
        {loading && (
          <div className="py-16 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
            <p className="text-sm">Loading security scans...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-rose-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1E293B] text-[11px] text-gray-400 uppercase tracking-wider bg-[#0B0F17]/50">
                  <th className="px-5 py-3">Scan</th>
                  <th className="px-5 py-3">Branch & Commit</th>
                  <th className="px-5 py-3">Source & Engine</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Findings Breakdown</th>
                  <th className="px-5 py-3">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {scans.map(scan => {
                  const cfg = STATUS_CONFIG[scan.status] || STATUS_CONFIG.pending
                  const Icon = cfg.icon
                  const totalFindings = (scan.critical_count || 0) + (scan.high_count || 0) + (scan.medium_count || 0) + (scan.low_count || 0)

                  return (
                    <tr key={scan.id} className="hover:bg-[#151D30] transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-white">
                        <span className="font-bold">#{scan.id}</span>
                        <div className="text-[10px] text-gray-500 font-sans mt-0.5">{scan.scan_id}</div>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-gray-300">
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          <GitBranch className="w-3.5 h-3.5 text-gray-500" /> {scan.branch}
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-400 mt-0.5">
                          <GitCommit className="w-3 h-3 text-gray-500" />
                          {scan.commit_sha ? scan.commit_sha.slice(0, 7) : 'HEAD'}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-gray-300">
                        <div className="font-medium capitalize text-white">{scan.source_type || 'manual'}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[140px]" title={scan.scanner}>
                          {scan.scanner || 'Multiple'}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          <Icon className={`w-3.5 h-3.5 ${scan.status === 'processing' ? 'animate-spin' : ''}`} />
                          <span className="capitalize">{scan.status}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        {scan.status === 'completed' ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{totalFindings}</span>
                            <div className="flex items-center gap-1 text-[10px]">
                              {scan.critical_count > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold">{scan.critical_count}C</span>}
                              {scan.high_count > 0 && <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-bold">{scan.high_count}H</span>}
                              {scan.medium_count > 0 && <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{scan.medium_count}M</span>}
                              {scan.low_count > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{scan.low_count}L</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {scan.completed_at ? new Date(scan.completed_at).toLocaleString() : (
                          scan.status === 'processing' ? <span className="text-blue-400">In Progress...</span> : 'Queued'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && scans.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <ScanLine className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-base font-semibold text-gray-300">No security scans executed yet</p>
            <p className="text-xs text-gray-500 mt-1">Trigger a manual scan or push a commit to start DevSecOps scanning.</p>
          </div>
        )}
      </div>

      {/* Trigger Scan Modal (Priority 4) */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-400 fill-current" /> Trigger Manual Security Scan
            </h3>
            <p className="text-xs text-gray-400">
              Dispatches an asynchronous scanning job across SAST, SCA, and Secret engines.
            </p>

            {scanError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {scanError}
              </div>
            )}

            <form onSubmit={handleTriggerScan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Select Target Project</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.github_repo || 'Internal'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Branch</label>
                <input
                  type="text"
                  placeholder="e.g. main, develop, feature/auth"
                  value={scanBranch}
                  onChange={e => setScanBranch(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-transparent rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scanSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {scanSubmitting ? 'Dispatching...' : 'Start Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compare Scans Modal (Priority 3) */}
      {compareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 max-w-2xl w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-blue-400" /> Compare Two Security Scans
              </h3>
              <button onClick={() => { setCompareModal(false); setDiffResult(null) }} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-gray-400">
              Calculate fingerprint diffs to identify newly introduced vulnerabilities vs resolved findings.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Baseline Scan (Before)</label>
                <select
                  value={compareScanA}
                  onChange={e => setCompareScanA(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg p-2 text-xs text-gray-200"
                >
                  <option value="">Select Baseline Scan</option>
                  {scans.filter(s => s.status === 'completed').map(s => (
                    <option key={s.id} value={s.id}>#{s.id} — {s.branch} ({s.commit_sha?.slice(0, 7) || 'HEAD'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Comparison Scan (After)</label>
                <select
                  value={compareScanB}
                  onChange={e => setCompareScanB(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-lg p-2 text-xs text-gray-200"
                >
                  <option value="">Select Target Scan</option>
                  {scans.filter(s => s.status === 'completed').map(s => (
                    <option key={s.id} value={s.id}>#{s.id} — {s.branch} ({s.commit_sha?.slice(0, 7) || 'HEAD'})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                disabled={diffLoading || !compareScanA || !compareScanB || compareScanA === compareScanB}
                onClick={handleCompare}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-colors"
              >
                {diffLoading ? 'Analyzing Diffs...' : 'Run Comparison'}
              </button>
            </div>

            {/* Comparison Diff Results */}
            {diffResult && (
              <div className="space-y-4 pt-4 border-t border-[#1E293B]">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
                    <div className="text-xl font-bold text-rose-400">{diffResult.newVulns.length}</div>
                    <div className="text-[11px] text-gray-400 uppercase font-medium mt-0.5">New Introduced</div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                    <div className="text-xl font-bold text-emerald-400">{diffResult.resolvedVulns.length}</div>
                    <div className="text-[11px] text-gray-400 uppercase font-medium mt-0.5">Resolved / Fixed</div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-700 p-3 rounded-lg">
                    <div className="text-xl font-bold text-gray-300">{diffResult.unchangedVulns.length}</div>
                    <div className="text-[11px] text-gray-400 uppercase font-medium mt-0.5">Unchanged</div>
                  </div>
                </div>

                {/* New Vulnerabilities List */}
                {diffResult.newVulns.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-rose-400 uppercase">Newly Introduced Findings:</div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {diffResult.newVulns.map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-[#0B0F17] p-2 rounded border border-rose-500/20">
                          <span className="text-white font-medium">{v.warning_type}</span>
                          <span className="text-gray-400 font-mono text-[11px]">{v.file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolved Vulnerabilities List */}
                {diffResult.resolvedVulns.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-emerald-400 uppercase">Eliminated / Fixed Findings:</div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {diffResult.resolvedVulns.map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-[#0B0F17] p-2 rounded border border-emerald-500/20">
                          <span className="text-white font-medium">{v.warning_type}</span>
                          <span className="text-gray-400 font-mono text-[11px]">{v.file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
