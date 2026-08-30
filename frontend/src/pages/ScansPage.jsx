import { useState, useEffect } from 'react'
import { fetchScans } from '../api/client'
import { ScanLine, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
  failed:    { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  pending:   { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  processing:{ icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10' }
}

export default function ScansPage() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScans()
      .then(res => setScans(res.data?.data || res.data || []))
      .catch(() => setScans([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Loading scans...</div></div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Scans</h1>
        <p className="text-gray-400 text-sm mt-1">Security scan history across all projects</p>
      </div>

      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700 text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-3">Scan ID</th>
              <th className="px-5 py-3">Branch</th>
              <th className="px-5 py-3">Commit</th>
              <th className="px-5 py-3">Scanner</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Vulns</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {scans.map(scan => {
              const cfg = STATUS_CONFIG[scan.status] || STATUS_CONFIG.pending
              const Icon = cfg.icon
              return (
                <tr key={scan.id} className="hover:bg-dark-700/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-sm">#{scan.id}</td>
                  <td className="px-5 py-3 text-sm">{scan.branch}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">{scan.commit_sha?.slice(0, 7)}</td>
                  <td className="px-5 py-3 text-sm">{scan.scanner || 'brakeman'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                      <Icon className="w-3 h-3" />{scan.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {scan.status === 'completed' ? (
                      <span className="text-red-400">{(scan.critical_count || 0) + (scan.high_count || 0) + (scan.medium_count || 0) + (scan.low_count || 0)}</span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{scan.completed_at ? new Date(scan.completed_at).toLocaleString() : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {scans.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <ScanLine className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No scans yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
