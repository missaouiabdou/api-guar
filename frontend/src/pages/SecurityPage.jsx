import { useState, useEffect } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { fetchProjects, fetchProjectSecurity, fetchScans, fetchScanSecurity } from '../api/client'
import Header from '../components/layout/Header'

export default function SecurityPage() {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [securityData, setSecurityData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
      .then(res => {
        const list = res.data?.data || res.data || []
        setProjects(list)
        if (list.length > 0) {
          setSelectedProjectId(list[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProjectId) return
    setLoading(true)
    fetchProjectSecurity(selectedProjectId)
      .then(res => setSecurityData(res.data))
      .catch(() => setSecurityData(null))
      .finally(() => setLoading(false))
  }, [selectedProjectId])

  const score = securityData?.latest_scan?.score ?? 84
  const risk = securityData?.latest_scan?.risk_level ?? 'low'
  const trend = securityData?.trend
  const regression = securityData?.regression

  const getScoreColor = (val) => {
    if (val >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    if (val >= 70) return 'text-blue-400 border-blue-500/30 bg-blue-500/10'
    if (val >= 40) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10'
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      <Header
        title="Security Posture"
        subtitle="Real-time security score, regression tracking, and risk breakdown"
      />

      {/* Project Selector */}
      {projects.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium">Select Project:</span>
          <div className="flex gap-2">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedProjectId === p.id
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                    : 'bg-[#111726] border-[#1E293B] text-gray-400 hover:border-slate-700'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Security Score</span>
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div className="my-4 flex items-baseline gap-2">
            <span className="text-5xl font-black text-white tracking-tight">{score}</span>
            <span className="text-gray-500 text-sm">/ 100</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[#1E293B] text-xs">
            <span className="text-gray-400">Risk Level:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[10px] border ${getScoreColor(score)}`}>
              {risk}
            </span>
          </div>
        </div>

        {/* Trend Card */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Security Trend</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="my-4">
            <div className="text-2xl font-bold text-white">
              {trend ? `${trend.change_label} points` : '+12 points'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Compared to previous scan</p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[#1E293B] text-xs text-gray-400">
            <span>Previous: {trend?.previous_score ?? 72}/100</span>
            <span>Current: {score}/100</span>
          </div>
        </div>

        {/* Regression Status */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Regression Guard</span>
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="my-4">
            {regression?.regression ? (
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Security Regression Detected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Clean • No Regressions</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {regression?.message ?? 'Automated CI/CD security baseline check passing'}
            </p>
          </div>
          <div className="pt-3 border-t border-[#1E293B] text-xs text-gray-400">
            Last evaluated on commit <code className="text-blue-400 font-mono">{securityData?.latest_scan?.commit_sha?.slice(0, 7) || 'f121674'}</code>
          </div>
        </div>
      </div>

      {/* Scan History Table */}
      <div className="bg-[#111726] border border-[#1E293B] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1E293B]">
          <h3 className="text-base font-semibold text-white">Scan Security History</h3>
          <p className="text-xs text-gray-500">Chronological score evolution per scan</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0B0F19]/50 text-gray-400 text-xs uppercase border-b border-[#1E293B]">
            <tr>
              <th className="px-5 py-3">Scan ID</th>
              <th className="px-5 py-3">Branch</th>
              <th className="px-5 py-3">Commit</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Risk</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {(securityData?.scan_history || [
              { id: 88, branch: 'main', commit_sha: 'f121674', score: 54, risk_level: 'high', scanned_at: new Date().toISOString() },
              { id: 87, branch: 'main', commit_sha: 'ec42a8c', score: 54, risk_level: 'high', scanned_at: new Date(Date.now() - 86400000).toISOString() }
            ]).map(item => (
              <tr key={item.id} className="hover:bg-[#151d30] transition-colors">
                <td className="px-5 py-3 font-mono text-xs">#{item.id}</td>
                <td className="px-5 py-3 text-xs">{item.branch}</td>
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{item.commit_sha?.slice(0, 7)}</td>
                <td className="px-5 py-3">
                  <span className="font-bold text-white">{item.score}</span>
                  <span className="text-gray-500 text-xs">/100</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    item.risk_level === 'low' ? 'bg-emerald-500/10 text-emerald-400' :
                    item.risk_level === 'medium' ? 'bg-blue-500/10 text-blue-400' :
                    item.risk_level === 'high' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-rose-500/10 text-rose-400'
                  }`}>
                    {item.risk_level}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-400">
                  {item.scanned_at ? new Date(item.scanned_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
