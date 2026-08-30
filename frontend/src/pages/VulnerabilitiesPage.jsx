import { useState, useEffect } from 'react'
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
  Code
} from 'lucide-react'
import { fetchVulnerabilities, updateVulnerability } from '../api/client'
import Header from '../components/layout/Header'

const SEVERITY_BADGES = {
  critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  info:     'bg-gray-500/10 text-gray-400 border-gray-500/20'
}

export default function VulnerabilitiesPage() {
  const [vulnerabilities, setVulnerabilities] = useState([])
  const [selectedVuln, setSelectedVuln] = useState(null)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('open')
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState(null)
  const [actionReason, setActionReason] = useState('')

  const loadData = () => {
    setLoading(true)
    const params = {}
    if (severityFilter !== 'all') params.severity = severityFilter
    if (statusFilter !== 'all') params.status = statusFilter

    fetchVulnerabilities(params)
      .then(res => {
        const list = res.data?.data || []
        setVulnerabilities(list)
        setMeta(res.data?.meta || null)
        if (list.length > 0 && !selectedVuln) {
          setSelectedVuln(list[0])
        }
      })
      .catch(() => {
        // Fallback demo data
        const demo = [
          {
            id: 1,
            warning_type: 'Command Injection',
            severity: 'critical',
            confidence: 'high',
            message: 'Possible command injection via shell execution',
            cwe: ['CWE-77'],
            file: 'app/controllers/api/v1/vulnerabilities_controller.rb',
            line: 26,
            status: 'open',
            code: '`ping -n 1 #{params[:ip]}`'
          },
          {
            id: 2,
            warning_type: 'Remote Code Execution',
            severity: 'critical',
            confidence: 'medium',
            message: 'Marshal.load called with parameter value',
            cwe: ['CWE-502'],
            file: 'app/controllers/api/v1/vulnerabilities_controller.rb',
            line: 57,
            status: 'open',
            code: 'Marshal.load(Base64.decode64(params[:payload]))'
          },
          {
            id: 3,
            warning_type: 'SQL Injection',
            severity: 'high',
            confidence: 'high',
            message: 'Possible SQL injection in raw query string interpolation',
            cwe: ['CWE-89'],
            file: 'app/controllers/api/v1/vulnerabilities_controller.rb',
            line: 16,
            status: 'open',
            code: 'Product.connection.select_all("SELECT * FROM products WHERE name LIKE \'#{params[:query]}\'")'
          },
          {
            id: 4,
            warning_type: 'Mass Assignment',
            severity: 'high',
            confidence: 'high',
            message: 'Specify exact keys allowed for mass assignment instead of permit!',
            cwe: ['CWE-915'],
            file: 'app/controllers/api/v1/vulnerabilities_controller.rb',
            line: 70,
            status: 'open',
            code: 'params.require(:user).permit!'
          },
          {
            id: 5,
            warning_type: 'File Access',
            severity: 'medium',
            confidence: 'low',
            message: 'Parameter value used directly in file name lookup',
            cwe: ['CWE-22'],
            file: 'app/controllers/api/v1/vulnerabilities_controller.rb',
            line: 41,
            status: 'open',
            code: 'File.read(Rails.root.join("public", params[:file]))'
          },
          {
            id: 6,
            warning_type: 'Path Traversal',
            severity: 'medium',
            confidence: 'high',
            message: 'Absolute paths in Pathname#join cause full path override',
            cwe: ['CWE-22'],
            file: 'app/controllers/api/v1/vulnerabilities_controller.rb',
            line: 39,
            status: 'open',
            code: 'Rails.root.join("public", params[:file])'
          }
        ]
        setVulnerabilities(demo)
        setSelectedVuln(demo[0])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [severityFilter, statusFilter])

  const handleUpdateStatus = (status) => {
    if (!selectedVuln) return
    updateVulnerability(selectedVuln.id, { status, reason: actionReason })
      .then(() => {
        setActionReason('')
        loadData()
      })
      .catch(() => {
        // Optimistic UI update
        setSelectedVuln(prev => ({ ...prev, status }))
        setVulnerabilities(prev =>
          prev.map(v => (v.id === selectedVuln.id ? { ...v, status } : v))
        )
      })
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <Header
        title="Security Alerts & Findings"
        subtitle="Vulnerability lifecycle management, triaging, and remediation"
      />

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111726] border border-[#1E293B] p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 font-semibold uppercase">Severity:</span>
          {['all', 'critical', 'high', 'medium', 'low'].map(s => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                severityFilter === s
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#1E293B]/50 text-gray-400 hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold uppercase">Status:</span>
          {['all', 'open', 'resolved', 'ignored'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#1E293B]/50 text-gray-400 hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Layout: List on Left, Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-3">
          {vulnerabilities.map(v => {
            const isSelected = selectedVuln?.id === v.id
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVuln(v)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#162035] border-blue-500/80 shadow-lg shadow-blue-500/5'
                    : 'bg-[#111726] border-[#1E293B] hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-white text-sm">{v.warning_type}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                      SEVERITY_BADGES[v.severity] || SEVERITY_BADGES.info
                    }`}
                  >
                    {v.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{v.message}</p>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1E293B] text-[11px] text-gray-500 font-mono">
                  <span className="truncate max-w-[200px]">{v.file?.split('/').pop()}:{v.line}</span>
                  <span className={`capitalize font-sans font-medium ${
                    v.status === 'open' ? 'text-rose-400' :
                    v.status === 'resolved' ? 'text-emerald-400' : 'text-gray-400'
                  }`}>
                    &bull; {v.status}
                  </span>
                </div>
              </div>
            )
          })}

          {vulnerabilities.length === 0 && (
            <div className="text-center py-16 bg-[#111726] border border-[#1E293B] rounded-xl text-gray-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400 opacity-60" />
              <p>No vulnerabilities found matching filters</p>
            </div>
          )}
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-7">
          {selectedVuln ? (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 space-y-6 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#1E293B] pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{selectedVuln.warning_type}</h2>
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs uppercase font-bold border ${
                        SEVERITY_BADGES[selectedVuln.severity] || SEVERITY_BADGES.info
                      }`}
                    >
                      {selectedVuln.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    {selectedVuln.file} : Line {selectedVuln.line}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Confidence</span>
                  <span className="text-xs font-semibold text-white uppercase">
                    {selectedVuln.confidence}
                  </span>
                </div>
              </div>

              {/* Message */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Description
                </h4>
                <p className="text-sm text-gray-200 bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
                  {selectedVuln.message}
                </p>
              </div>

              {/* Vulnerable Code snippet */}
              {selectedVuln.code && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    <Code className="w-3.5 h-3.5" />
                    <span>Vulnerable Source Code</span>
                  </div>
                  <pre className="bg-[#090D16] border border-[#1E293B] p-4 rounded-lg text-xs font-mono text-rose-300 overflow-x-auto">
                    <code>{selectedVuln.code}</code>
                  </pre>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
                  <span className="text-gray-500 block">CWE Classification</span>
                  <span className="text-white font-medium">
                    {Array.isArray(selectedVuln.cwe) && selectedVuln.cwe.length > 0
                      ? selectedVuln.cwe.join(', ')
                      : 'CWE-89'}
                  </span>
                </div>
                <div className="bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
                  <span className="text-gray-500 block">Lifecycle Status</span>
                  <span className="text-white font-medium capitalize">
                    {selectedVuln.status}
                  </span>
                </div>
              </div>

              {/* Action Bar (Resolve / Ignore / Reopen) */}
              <div className="pt-4 border-t border-[#1E293B] space-y-3">
                <input
                  type="text"
                  placeholder="Add triage note or remediation reason (optional)..."
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleUpdateStatus('resolved')}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('ignored')}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#1E293B] hover:bg-[#28354D] text-gray-300 font-semibold py-2 px-4 rounded-lg text-xs transition-colors border border-slate-700"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Ignore / False Positive
                  </button>
                  {selectedVuln.status !== 'open' && (
                    <button
                      onClick={() => handleUpdateStatus('open')}
                      className="flex items-center justify-center gap-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-semibold py-2 px-3 rounded-lg text-xs transition-colors border border-rose-500/30"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 text-gray-500 bg-[#111726] border border-[#1E293B] rounded-xl">
              Select a vulnerability to inspect details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
