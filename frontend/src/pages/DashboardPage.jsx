import { useState, useEffect } from 'react'
import {
  FolderGit2,
  GitFork,
  Rocket,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts'
import Header from '../components/layout/Header'
import { fetchDashboard } from '../api/client'

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboard()
      .then(res => {
        if (res.data) setDashboardData(res.data)
        else setError('Empty response from API')
      })
      .catch(err => setError(err?.response?.data?.error || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
        <Header title="Dashboard" subtitle="Overview of your DevSecOps platform" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#111726] border border-[#1E293B] rounded-xl p-5 h-80 animate-pulse" />
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 h-80 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 h-64 animate-pulse" />
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 h-64 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
        <Header title="Dashboard" subtitle="Overview of your DevSecOps platform" />
        <div className="bg-[#111726] border border-rose-500/30 rounded-xl p-8 text-center">
          <p className="text-rose-400 font-medium">Failed to load dashboard data</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchDashboard().then(r => setDashboardData(r.data)).catch(e => setError(e?.message)).finally(() => setLoading(false)) }}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { projects, repositories, deployments, webhooks, pipelines, security } = dashboardData

  const deploymentHistory = deployments?.last_7_days || []
  const webhookActivity = webhooks?.activity_24h || []
  const recentWebhookEvents = webhooks?.recent_events || []

  const gateStatus = security?.gate_status

  const pipelineTotal = (pipelines?.breakdown?.success ?? 0) +
    (pipelines?.breakdown?.failed ?? 0) +
    (pipelines?.breakdown?.running ?? 0) +
    (pipelines?.breakdown?.pending ?? 0)

  const pipelineStatusChart = pipelineTotal > 0
    ? [
        { name: 'Success', value: pipelines.breakdown.success, color: '#10B981' },
        { name: 'Failed',  value: pipelines.breakdown.failed,  color: '#EF4444' },
        { name: 'Running', value: pipelines.breakdown.running, color: '#3B82F6' },
        { name: 'Pending', value: pipelines.breakdown.pending, color: '#F59E0B' }
      ]
    : [{ name: 'No data', value: 1, color: '#1E293B' }]

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Top Header */}
      <Header
        title="Dashboard"
        subtitle="Overview of your DevSecOps platform"
      />

      {/* DevSecOps Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        gateStatus === 'PASS'
          ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400'
          : gateStatus === 'WARNING'
            ? 'bg-amber-500/5 border-amber-500/30 text-amber-400'
            : gateStatus === 'PENDING' || !gateStatus
              ? 'bg-[#111726] border-[#1E293B] text-gray-400'
              : 'bg-rose-500/5 border-rose-500/30 text-rose-400'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            gateStatus === 'PASS'
              ? 'bg-emerald-500/10 text-emerald-400'
              : gateStatus === 'WARNING'
                ? 'bg-amber-500/10 text-amber-400'
                : gateStatus === 'PENDING' || !gateStatus
                  ? 'bg-gray-500/10 text-gray-400'
                  : 'bg-rose-500/10 text-rose-400'
          }`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                CI/CD Release Gate: {gateStatus ?? 'PENDING'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white">
                Risk: {security?.risk_level || 'unknown'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {security?.regression
                ? '⚠️ Security regression detected in latest build.'
                : gateStatus === 'PENDING' || !gateStatus
                  ? 'No completed scans yet — trigger a scan to establish a security baseline.'
                  : 'No security regressions detected in the latest completed scan.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-1.5 text-center">
            <span className="text-[10px] text-gray-500 block">Security Score</span>
            <span className="text-sm font-bold text-white">
              {security?.score != null ? `${security.score}/100` : '—'}
            </span>
          </div>
          <a
            href="/security"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Inspect Security Gate &rarr;
          </a>
        </div>
      </div>

      {/* ── 8 Stat / Metrics Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Projects */}
        <div className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-gray-400 text-xs font-medium tracking-wide">Total Projects</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{projects?.total ?? 0}</div>
            <div className={`flex items-center gap-1 text-[11px] font-medium mt-1 ${(projects?.change_percent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(projects?.change_percent ?? 0) >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              <span>{projects?.change_percent ?? 0}% this week</span>
            </div>
          </div>
        </div>

        {/* Card 2: GitHub Repositories */}
        <div className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-gray-400 text-xs font-medium tracking-wide">GitHub Repositories</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <GitFork className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{repositories?.total ?? 0}</div>
            <div className={`flex items-center gap-1 text-[11px] font-medium mt-1 ${(repositories?.change_percent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(repositories?.change_percent ?? 0) >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              <span>{repositories?.change_percent ?? 0}% this week</span>
            </div>
          </div>
        </div>


        {/* Card 3: Deployments Today */}
        <div className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-gray-400 text-xs font-medium tracking-wide">Deployments Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Rocket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{deployments?.today ?? 0}</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mt-1">
              <span>{deployments?.scans_today ?? 0} security scans run today</span>
            </div>
          </div>
        </div>

        {/* Card 4: Webhook Events */}
        <div className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-gray-400 text-xs font-medium tracking-wide">Webhook Events</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{webhooks?.total ?? 0}</div>
            <div className={`flex items-center gap-1 text-[11px] font-medium mt-1 ${(webhooks?.change_percent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(webhooks?.change_percent ?? 0) >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              <span>{webhooks?.change_percent ?? 0}% vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Card 5: Pipeline Success Rate */}
        <div className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-gray-400 text-xs font-medium tracking-wide">Pipeline Success Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{pipelines?.success_rate ?? 0}%</div>
            <div className={`flex items-center gap-1 text-[11px] font-medium mt-1 ${(pipelines?.change_percent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(pipelines?.change_percent ?? 0) >= 0
                ? <ArrowUpRight className="w-3 h-3" />
                : <ArrowDownRight className="w-3 h-3" />}
              <span>{pipelines?.change_percent ?? 0}% vs last week</span>
            </div>
          </div>
        </div>

        {/* Card 6: Failed Pipelines */}
        <div className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-gray-400 text-xs font-medium tracking-wide">Failed Pipelines</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{pipelines?.failed ?? 0}</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mt-1">
              <span>{pipelines?.running ?? 0} running · {pipelines?.pending ?? 0} pending</span>
            </div>
          </div>
        </div>

        {/* Card 7: Security Alerts */}
        <div className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-gray-400 text-xs font-medium tracking-wide">Security Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{security?.open_alerts ?? 0}</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mt-1">
              <span>
                {security?.by_severity?.critical ?? 0}C · {security?.by_severity?.high ?? 0}H · {security?.by_severity?.medium ?? 0}M · {security?.by_severity?.low ?? 0}L
              </span>
            </div>
          </div>
        </div>

        {/* Card 8: Critical Alerts */}
        <div className="bg-[#111726] border border-[#1E293B] hover:border-slate-700 transition-all rounded-xl p-5 relative flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-gray-400 text-xs font-medium tracking-wide">Critical Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{security?.critical_alerts ?? 0}</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-rose-400 mt-1">
              {(security?.critical_alerts ?? 0) > 0
                ? <><ArrowUpRight className="w-3 h-3" /><span>Needs immediate attention</span></>
                : <span className="text-emerald-400">No critical issues</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Deployments Bar Chart & Pipeline Donut Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Deployments Bar Chart */}
        <div className="lg:col-span-2 bg-[#111726] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Pipeline & Scan Activity</h3>
              <p className="text-xs text-gray-500">Security scans and executions (last 7 days)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                <span>Success</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
                <span>Failed</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            {deploymentHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deploymentHistory}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  barSize={32}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#1E293B', opacity: 0.4 }}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="success" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                No deployment data yet
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3: Pipeline Status Donut */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-white">Pipeline Status</h3>
            <p className="text-xs text-gray-500">Overall breakdown</p>
          </div>

          <div className="h-48 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pipelineStatusChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={pipelineTotal > 0 ? 3 : 0}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pipelineStatusChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                {pipelineTotal > 0 && (
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            {pipelineTotal === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">No data</div>
            )}
          </div>

          {/* Breakdown Legend */}
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-2 border-t border-[#1E293B] text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                <span>Success</span>
              </div>
              <span className="font-semibold text-white">{pipelines?.breakdown?.success ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                <span>Failed</span>
              </div>
              <span className="font-semibold text-white">{pipelines?.breakdown?.failed ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
                <span>Running</span>
              </div>
              <span className="font-semibold text-white">{pipelines?.breakdown?.running ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                <span>Pending</span>
              </div>
              <span className="font-semibold text-white">{pipelines?.breakdown?.pending ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Webhook Activity & Recent Webhook Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Webhook Activity Area Chart */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">Webhook Activity</h3>
            <p className="text-xs text-gray-500">Events over 24 hours</p>
          </div>

          <div className="h-48 w-full">
            {webhookActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={webhookActivity}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="events"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEvents)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                No webhook activity in the last 24 hours
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Webhook Events */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Recent Webhook Events</h3>
              <p className="text-xs text-gray-500">Latest incoming events</p>
            </div>
            <a
              href="/events"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-medium"
            >
              View all &rarr;
            </a>
          </div>

          <div className="space-y-3">
            {recentWebhookEvents.length > 0 ? recentWebhookEvents.map(evt => (
              <div
                key={evt.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#0B0F19]/60 border border-[#1E293B]/70 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <div>
                    <div className="text-sm font-medium text-white">{evt.repo}</div>
                    <div className="text-xs text-gray-500">
                      {evt.event} &bull; {evt.branch}
                      {evt.time_ago && <span className="ml-2 text-gray-600">{evt.time_ago}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    evt.status === 'Success' || evt.status === 'processed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : evt.status === 'Failed' || evt.status === 'failed'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      evt.status === 'Success' || evt.status === 'processed' ? 'bg-emerald-400'
                      : evt.status === 'Failed' || evt.status === 'failed' ? 'bg-rose-400'
                      : 'bg-gray-400'
                    }`}></span>
                    {evt.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                No webhook events yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
