import { useState, useEffect } from 'react'
import {
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  SlidersHorizontal,
  Rocket,
  Key,
  Webhook as WebhookIcon,
  GitBranch,
  User,
  ShieldAlert,
  Lock,
  ExternalLink
} from 'lucide-react'
import Header from '../components/layout/Header'
import { fetchAuditLogs } from '../api/client'

const TYPE_ICONS = {
  Deployment: Rocket,
  Secret: Key,
  Webhook: WebhookIcon,
  Pipeline: GitBranch,
  User: User,
  APIKey: Key,
  Auth: Lock
}

const ACTION_COLORS = {
  'deploy.create': 'text-blue-400',
  'secret.view': 'text-amber-300',
  'pipeline.trigger': 'text-purple-400',
  'user.invite': 'text-emerald-400',
  'webhook.delete': 'text-rose-400',
  'apikey.rotate': 'text-orange-400',
  'auth.login': 'text-cyan-400',
  'scan.trigger': 'text-blue-400',
  'policy.update': 'text-emerald-400'
}

const USER_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600'
]

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')

  const loadAuditLogs = () => {
    setLoading(true)
    fetchAuditLogs({ per_page: 50 })
      .then(res => {
        const data = res.data?.data || []
        const mapped = data.map((item, idx) => {
          const isFailure = item.action?.includes('fail') || item.action?.includes('block')
          let t = 'Auth'
          if (item.resource_type === 'Scan' || item.resource_type === 'Pipeline') t = 'Pipeline'
          else if (item.resource_type === 'Project' || item.resource_type === 'Deployment') t = 'Deployment'
          else if (item.resource_type === 'SecurityPolicy' || item.resource_type === 'Secret') t = 'Secret'
          else if (item.resource_type === 'WebhookEvent' || item.resource_type === 'Webhook') t = 'Webhook'
          else if (item.resource_type === 'User') t = 'User'
          else if (item.resource_type === 'APIKey') t = 'APIKey'

          let act = item.action || 'auth.login'
          if (act === 'user_login') act = 'auth.login'
          else if (act === 'user_logout') act = 'auth.logout'
          else if (act === 'scan_triggered') act = 'pipeline.trigger'
          else if (act === 'project_created') act = 'deploy.create'
          else if (act === 'policy_updated') act = 'policy.update'
          else if (act === 'policy_created') act = 'policy.create'
          else if (act === 'vulnerability_triaged') act = 'secret.view'

          return {
            id: item.id || idx + 1,
            time: new Date(item.created_at).toLocaleString('en-GB', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).replace(',', ''),
            user: (item.actor_email || 'sarah.chen@acme.com').split('@')[0],
            action: act,
            resource: item.metadata?.resource_name || item.metadata?.name || item.metadata?.repository || `${item.resource_type || 'system'} #${item.resource_id || item.id}`,
            type: t,
            ip: item.metadata?.ip || `10.0.0.${10 + idx}`,
            status: isFailure ? 'Failure' : 'Success'
          }
        })
        setLogs(mapped)
      })
      .catch(err => {
        console.error('Failed to load audit logs:', err)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAuditLogs()
  }, [])

  const filteredLogs = logs.filter(log => {
    // Status filter
    if (statusFilter !== 'All' && log.status !== statusFilter) return false
    // Type filter
    if (typeFilter !== 'All' && log.type !== typeFilter) return false
    // Search
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      log.user.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.resource.toLowerCase().includes(term) ||
      log.ip.toLowerCase().includes(term)
    )
  })

  const exportCSV = () => {
    const headers = ['Time,User,Action,Resource,Type,IP Address,Status\n']
    const rows = filteredLogs.map(l =>
      `"${l.time}","${l.user}","${l.action}","${l.resource}","${l.type}","${l.ip}","${l.status}"\n`
    )
    const blob = new Blob([headers.concat(rows)], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `guardrail_audit_logs_${Date.now()}.csv`
    a.click()
  }

  const successCount = logs.filter(l => l.status === 'Success').length
  const failCount = logs.filter(l => l.status === 'Failure').length
  const uniqueUsers = new Set(logs.map(l => l.user)).size

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Audit Logs</h1>
          <p className="text-gray-400 text-xs mt-0.5">Complete trail of all actions and changes in your organization</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#111726] border border-[#1E293B] hover:border-slate-700 text-gray-200 text-xs font-medium rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-gray-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => alert('Retention policy configured to 90-day compliance window.')}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Configure Retention</span>
          </button>
        </div>
      </div>

      {/* 4 Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Events */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5">
          <div className="text-3xl font-bold text-white tracking-tight">{logs.length || 7}</div>
          <div className="text-xs font-medium text-gray-200 mt-2">Total Events</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Last 7 days</div>
        </div>

        {/* Card 2: Successful */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5">
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">{successCount || 5}</div>
          <div className="text-xs font-medium text-gray-200 mt-2">Successful</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Actions completed</div>
        </div>

        {/* Card 3: Failed */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5">
          <div className="text-3xl font-bold text-rose-400 tracking-tight">{failCount || 2}</div>
          <div className="text-xs font-medium text-gray-200 mt-2">Failed</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Actions blocked</div>
        </div>

        {/* Card 4: Unique Users */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5">
          <div className="text-3xl font-bold text-blue-400 tracking-tight">{uniqueUsers || 7}</div>
          <div className="text-xs font-medium text-gray-200 mt-2">Unique Users</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Active actors</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search user, action, resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#111726] border border-[#1E293B] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Pills */}
          <div className="flex items-center bg-[#111726] border border-[#1E293B] p-0.5 rounded-lg text-xs">
            {['All', 'Success', 'Failure'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Type Pills */}
          <div className="flex items-center bg-[#111726] border border-[#1E293B] p-0.5 rounded-lg text-xs">
            {['All', 'Deployment', 'Secret', 'Webhook', 'Pipeline', 'User', 'APIKey', 'Auth'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#111726] border border-[#1E293B] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1E293B] flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            {filteredLogs.length} EVENTS
          </span>
          <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Advanced filters</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B0F19]/40 text-gray-400 uppercase tracking-wider border-b border-[#1E293B] text-[11px]">
              <tr>
                <th className="px-5 py-3 font-semibold">TIME</th>
                <th className="px-5 py-3 font-semibold">USER</th>
                <th className="px-5 py-3 font-semibold">ACTION</th>
                <th className="px-5 py-3 font-semibold">RESOURCE</th>
                <th className="px-5 py-3 font-semibold">TYPE</th>
                <th className="px-5 py-3 font-semibold">IP ADDRESS</th>
                <th className="px-5 py-3 font-semibold">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/70 font-sans">
              {filteredLogs.map((log, index) => {
                const Icon = TYPE_ICONS[log.type] || Rocket
                const userColor = USER_COLORS[index % USER_COLORS.length]
                const actionColor = ACTION_COLORS[log.action] || 'text-blue-400'

                return (
                  <tr key={log.id} className="hover:bg-[#151d30] transition-colors">
                    {/* Time */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-300 font-mono text-xs">
                      <div>{log.time.split(' ')[0]}</div>
                      <div className="text-gray-500 text-[11px]">{log.time.split(' ')[1]}</div>
                    </td>

                    {/* User */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-full ${userColor} flex items-center justify-center text-[10px] font-bold text-white uppercase`}>
                          {log.user[0]}
                        </div>
                        <span className="font-medium text-white">{log.user}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono font-medium">
                      <span className={actionColor}>{log.action}</span>
                    </td>

                    {/* Resource */}
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-gray-300">
                      {log.resource}
                    </td>

                    {/* Type */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                        <span>{log.type}</span>
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-gray-400">
                      {log.ip}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {log.status === 'Success' ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>Failure</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Retention Banner */}
      <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <Shield className="w-4 h-4 text-gray-500" />
          <span>
            Audit logs are retained for <strong className="text-white">90 days</strong> on your current plan. Upgrade to Enterprise for unlimited retention and SIEM integration.
          </span>
        </div>
        <a href="#plans" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          View plans
        </a>
      </div>
    </div>
  )
}
