import { useState, useEffect } from 'react'
import {
  Shield,
  Search,
  Play,
  Package,
  Key,
  Box,
  Code2,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Filter,
  SlidersHorizontal,
  X,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  FileCode
} from 'lucide-react'
import {
  fetchProjects,
  fetchProjectSecurity,
  fetchVulnerabilities,
  triggerScan,
  updateVulnerability
} from '../api/client'

export default function SecurityPage() {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [securityData, setSecurityData] = useState(null)
  const [vulnerabilities, setVulnerabilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [activeTypeFilter, setActiveTypeFilter] = useState('All')
  const [selectedVuln, setSelectedVuln] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjects()
      .then(res => {
        const list = res.data?.data || res.data || []
        setProjects(list)
        if (list.length > 0) {
          const preferred = list.find(p => p.id === 7 || p.github_repo === 'missaouiabdou/guardial') || list[0]
          setSelectedProjectId(preferred.id)
        }
      })
      .catch(() => {})
  }, [])

  const loadSecurityData = () => {
    if (!selectedProjectId) return
    setLoading(true)
    Promise.all([
      fetchProjectSecurity(selectedProjectId).catch(() => null),
      fetchVulnerabilities({ project_id: selectedProjectId, status: 'open', latest: true, per_page: 100 }).catch(() => null)
    ]).then(([secRes, vulnRes]) => {
      setSecurityData(secRes?.data || null)
      const realVulns = vulnRes?.data?.data || []
      const mapped = realVulns.map(v => {
        let t = 'Code'
        if (v.scan_type === 'sca' || v.scan_type === 'dependency' || v.scanner?.toLowerCase().includes('audit')) t = 'Dependency'
        else if (v.scan_type === 'secret' || v.scanner?.toLowerCase().includes('gitleaks')) t = 'Secret'
        else if (v.scan_type === 'container' || v.scanner?.toLowerCase().includes('container') || v.file?.toLowerCase().includes('dockerfile')) t = 'Container'

        const sev = v.severity ? v.severity.charAt(0).toUpperCase() + v.severity.slice(1).toLowerCase() : 'Medium'
        return {
          id: v.id,
          severity: sev,
          title: v.warning_type || v.message || 'Security Vulnerability',
          package: v.file?.split('/')?.pop() || v.file || 'application',
          version: v.line ? `L${v.line}` : '—',
          fix: 'Review & Patch',
          type: t,
          scanner: v.scanner || 'semgrep',
          raw: v
        }
      })
      setVulnerabilities(mapped)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSecurityData()
  }, [selectedProjectId])

  const handleRunScan = () => {
    if (!selectedProjectId || scanning) return
    setScanning(true)
    triggerScan(selectedProjectId, { branch: 'main' })
      .then(() => {
        let attempts = 0
        const pollInterval = setInterval(() => {
          attempts++
          loadSecurityData()
          if (attempts >= 8) {
            clearInterval(pollInterval)
            setScanning(false)
          }
        }, 3000)
      })
      .catch(err => {
        setScanning(false)
        if (err?.response?.status === 409) {
          alert('A scan is already actively processing for this project.')
        } else {
          alert('Failed to launch scan: ' + (err?.response?.data?.error || err.message))
        }
      })
  }

  const handleTriage = (vulnId, newStatus) => {
    updateVulnerability(vulnId, { status: newStatus })
      .then(() => {
        setVulnerabilities(prev => prev.filter(v => v.id !== vulnId))
        setSelectedVuln(null)
        loadSecurityData()
      })
      .catch(() => {
        setVulnerabilities(prev => prev.filter(v => v.id !== vulnId))
        setSelectedVuln(null)
      })
  }

  const hasScans = Boolean(securityData?.latest_scan)

  // Dynamic calculated metrics from real scan
  const score = hasScans ? (securityData?.latest_scan?.score ?? 0) : null
  const criticalCount = hasScans
    ? (securityData?.latest_scan?.vulnerabilities?.critical ?? vulnerabilities.filter(v => v.severity === 'Critical').length)
    : 0
  const highCount = hasScans
    ? (securityData?.latest_scan?.vulnerabilities?.high ?? vulnerabilities.filter(v => v.severity === 'High').length)
    : 0

  const trend = securityData?.trend

  // Dynamic category metrics from backend
  const depStats = securityData?.categories?.dependency || {
    score: hasScans ? 100 : null,
    issues_count: vulnerabilities.filter(v => v.type === 'Dependency').length,
    critical_count: vulnerabilities.filter(v => v.type === 'Dependency' && v.severity === 'Critical').length
  }
  const secretStats = securityData?.categories?.secrets || {
    score: hasScans ? 100 : null,
    issues_count: vulnerabilities.filter(v => v.type === 'Secret').length,
    critical_count: vulnerabilities.filter(v => v.type === 'Secret' && v.severity === 'Critical').length
  }
  const containerStats = securityData?.categories?.container || {
    score: hasScans ? 100 : null,
    issues_count: vulnerabilities.filter(v => v.type === 'Container').length,
    critical_count: vulnerabilities.filter(v => v.type === 'Container' && v.severity === 'Critical').length
  }
  const codeStats = securityData?.categories?.code || {
    score: hasScans ? 100 : null,
    issues_count: vulnerabilities.filter(v => v.type === 'Code').length,
    critical_count: vulnerabilities.filter(v => v.type === 'Code' && v.severity === 'Critical').length
  }

  // Recommendations dynamically extracted from active critical & high findings
  const dynamicRecommendations = vulnerabilities
    .filter(v => v.severity === 'Critical' || v.severity === 'High')
    .slice(0, 4)
    .map((v, idx) => ({
      id: v.id,
      severity: v.severity,
      title: v.type === 'Secret'
        ? `Rotate exposed credential in ${v.package}`
        : (v.type === 'Dependency'
            ? `Upgrade dependency in ${v.package} to resolve ${v.title}`
            : `Remediate ${v.title} in ${v.package}`),
      action: v.type === 'Secret' ? 'Rotate now' : (v.type === 'Dependency' ? '+ Update package' : 'Review & Fix'),
      btnStyle: idx === 1 ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#111726] border border-[#1E293B] hover:border-slate-600 text-blue-400',
      vuln: v
    }))

  // Filter pills counts
  const typeCounts = {
    All: vulnerabilities.length,
    Dependency: vulnerabilities.filter(v => v.type === 'Dependency').length,
    Secret: vulnerabilities.filter(v => v.type === 'Secret').length,
    Container: vulnerabilities.filter(v => v.type === 'Container').length,
    Code: vulnerabilities.filter(v => v.type === 'Code').length
  }

  // Filtered vulnerabilities for table display
  const filteredVulns = vulnerabilities.filter(v => {
    if (activeTypeFilter !== 'All' && v.type !== activeTypeFilter) return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      v.title.toLowerCase().includes(term) ||
      v.package.toLowerCase().includes(term) ||
      v.type.toLowerCase().includes(term) ||
      v.severity.toLowerCase().includes(term) ||
      (v.raw?.message && v.raw.message.toLowerCase().includes(term))
    )
  })

  // Circular gauge calculations
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const numericScore = score !== null ? score : 0
  const strokeDashoffset = score !== null ? circumference - (numericScore / 100) * circumference : circumference

  const getScoreColor = (val) => {
    if (val === null || val === undefined) return '#64748B' // slate-500
    if (val >= 85) return '#10B981' // Green
    if (val >= 70) return '#F59E0B' // Orange / Amber
    return '#EF4444' // Red
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Security</h1>
          <p className="text-gray-400 text-xs mt-0.5">Vulnerability management and security posture</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Project selector dropdown */}
          {projects.length > 0 && (
            <select
              value={selectedProjectId || ''}
              onChange={e => setSelectedProjectId(Number(e.target.value))}
              className="px-3 py-1.5 bg-[#111726] border border-[#1E293B] rounded-lg text-xs text-gray-300 focus:outline-none focus:border-blue-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.github_repo || p.repository_url?.replace(/^https?:\/\/github\.com\//, '') || 'repo'}
                </option>
              ))}
            </select>
          )}

          {/* Search box */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search findings..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-[#111726] border border-[#1E293B] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 border border-[#1E293B] px-1 rounded bg-[#0B0F19]">
              ⌘K
            </span>
          </div>

          {/* Run Scan Button */}
          <button
            onClick={handleRunScan}
            disabled={scanning || !selectedProjectId}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning...' : 'Run Scan'}</span>
          </button>
        </div>
      </div>

      {/* If project has no scans yet, banner notice */}
      {!loading && !hasScans && (
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">No scan completed yet for this project</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Run an automated scan to inspect this repository with Brakeman, Semgrep, Gitleaks, and Bundler Audit.
              </p>
            </div>
          </div>
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning...' : 'Run First Scan'}</span>
          </button>
        </div>
      )}

      {/* Top Grid: Score Card (Left) + 4 Category Cards (Right 2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Security Score Card */}
        <div className="lg:col-span-5 bg-[#111726] border border-[#1E293B] rounded-xl p-6 flex items-center gap-6">
          {/* Circular Progress Gauge */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background track circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-[#1E293B]"
                strokeWidth="9"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Animated Progress circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={hasScans ? getScoreColor(score) : '#334155'}
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <span className="absolute text-3xl font-black text-white tracking-tight">
              {hasScans ? score : '—'}
            </span>
          </div>

          {/* Score Details */}
          <div className="space-y-2">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Security Score</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {!hasScans
                  ? 'No scan results available'
                  : score >= 85
                    ? 'Strong security posture'
                    : score >= 50
                      ? 'Moderate security risk'
                      : 'Critical security issues detected'}
              </p>
            </div>

            {hasScans && trend && trend.change !== 0 ? (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${trend.change > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {trend.change > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{trend.change > 0 ? `Up ${trend.change} points vs previous scan` : `Down ${Math.abs(trend.change)} points vs previous scan`}</span>
              </div>
            ) : hasScans ? (
              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Scan #{securityData?.latest_scan?.id} ({securityData?.latest_scan?.branch} @ {securityData?.latest_scan?.commit_sha?.substring(0, 7) || 'HEAD'})</span>
              </div>
            ) : (
              <div className="text-xs text-gray-500 font-medium">Awaiting first scan analysis</div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {criticalCount} Critical
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {highCount} High
              </span>
            </div>
          </div>
        </div>

        {/* Right: 4 Category Scan Cards (2x2 Grid) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Dependency Scan */}
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Package className="w-4 h-4" />
              </div>
              {depStats.critical_count > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  ▲ {depStats.critical_count} Critical
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="mt-3">
              <span className="text-xs text-gray-400 font-medium">Dependency Scan</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold" style={{ color: getScoreColor(depStats.score) }}>
                  {depStats.score !== null ? depStats.score : '—'}
                </span>
                <span className="text-xs text-gray-400">{depStats.issues_count} issues</span>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="w-full bg-[#0B0F19] h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${depStats.score !== null ? depStats.score : 0}%`,
                  backgroundColor: getScoreColor(depStats.score)
                }}
              />
            </div>
          </div>

          {/* Card 2: Secrets Scan */}
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Key className="w-4 h-4" />
              </div>
              {secretStats.critical_count > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  ▲ {secretStats.critical_count} Critical
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="mt-3">
              <span className="text-xs text-gray-400 font-medium">Secrets Scan</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold" style={{ color: getScoreColor(secretStats.score) }}>
                  {secretStats.score !== null ? secretStats.score : '—'}
                </span>
                <span className="text-xs text-gray-400">{secretStats.issues_count} issues</span>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="w-full bg-[#0B0F19] h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${secretStats.score !== null ? secretStats.score : 0}%`,
                  backgroundColor: getScoreColor(secretStats.score)
                }}
              />
            </div>
          </div>

          {/* Card 3: Container Scan */}
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Box className="w-4 h-4" />
              </div>
              {containerStats.critical_count > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  ▲ {containerStats.critical_count} Critical
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="mt-3">
              <span className="text-xs text-gray-400 font-medium">Container Scan</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold" style={{ color: getScoreColor(containerStats.score) }}>
                  {containerStats.score !== null ? containerStats.score : '—'}
                </span>
                <span className="text-xs text-gray-400">{containerStats.issues_count} issues</span>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="w-full bg-[#0B0F19] h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${containerStats.score !== null ? containerStats.score : 0}%`,
                  backgroundColor: getScoreColor(containerStats.score)
                }}
              />
            </div>
          </div>

          {/* Card 4: Code Scan (SAST) */}
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Code2 className="w-4 h-4" />
              </div>
              {codeStats.critical_count > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  ▲ {codeStats.critical_count} Critical
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="mt-3">
              <span className="text-xs text-gray-400 font-medium">Code Scan</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold" style={{ color: getScoreColor(codeStats.score) }}>
                  {codeStats.score !== null ? codeStats.score : '—'}
                </span>
                <span className="text-xs text-gray-400">{codeStats.issues_count} issues</span>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="w-full bg-[#0B0F19] h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${codeStats.score !== null ? codeStats.score : 0}%`,
                  backgroundColor: getScoreColor(codeStats.score)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Vulnerabilities Table */}
      <div className="space-y-3">
        {/* Header & Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Vulnerabilities ({filteredVulns.length})
          </h2>

          <div className="flex items-center gap-2">
            {/* Filter Pills with Counts */}
            <div className="flex items-center bg-[#111726] border border-[#1E293B] p-0.5 rounded-lg text-xs">
              {['All', 'Dependency', 'Secret', 'Container', 'Code'].map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTypeFilter(t)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTypeFilter === t
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t}
                  {typeCounts[t] > 0 && (
                    <span className="opacity-75 text-[10px] ml-1">({typeCounts[t]})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Clear Filters if active */}
            {activeTypeFilter !== 'All' && (
              <button
                onClick={() => setActiveTypeFilter('All')}
                className="px-2.5 py-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0F19]/40 text-gray-400 uppercase tracking-wider border-b border-[#1E293B] text-[11px]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">SEVERITY</th>
                  <th className="px-5 py-3.5 font-semibold">TITLE</th>
                  <th className="px-5 py-3.5 font-semibold">PACKAGE</th>
                  <th className="px-5 py-3.5 font-semibold">VERSION</th>
                  <th className="px-5 py-3.5 font-semibold">FIX AVAILABLE</th>
                  <th className="px-5 py-3.5 font-semibold">TYPE</th>
                  <th className="px-5 py-3.5 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/70 font-sans">
                {filteredVulns.map(v => {
                  const sevColor =
                    v.severity === 'Critical'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : v.severity === 'High'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : v.severity === 'Medium'
                          ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'

                  const dotColor =
                    v.severity === 'Critical'
                      ? 'bg-rose-400'
                      : v.severity === 'High'
                        ? 'bg-amber-400'
                        : v.severity === 'Medium'
                          ? 'bg-yellow-400'
                          : 'bg-blue-400'

                  return (
                    <tr key={v.id} className="hover:bg-[#151d30] transition-colors">
                      {/* Severity */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${sevColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          {v.severity}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-5 py-3.5 font-medium text-white max-w-xs">
                        <div className="truncate font-semibold">{v.title}</div>
                        {v.raw?.cwe && v.raw.cwe.length > 0 && (
                          <span className="text-[10px] font-mono text-gray-500">{v.raw.cwe.join(', ')}</span>
                        )}
                      </td>

                      {/* Package / File */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-blue-400" title={v.raw?.file}>
                        {v.package}
                      </td>

                      {/* Version / Line */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-gray-400">
                        {v.version}
                      </td>

                      {/* Fix Available */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs">
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{v.fix}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-gray-300 font-medium">{v.type}</span>
                        <span className="text-gray-500 text-[10px] block font-mono lowercase">{v.scanner}</span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedVuln(v)}
                          className="text-blue-400 hover:text-blue-300 font-semibold text-xs transition-colors flex items-center gap-1 ml-auto"
                        >
                          <span>Fix</span>
                          <span>&rarr;</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filteredVulns.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      {vulnerabilities.length === 0
                        ? 'No active vulnerabilities detected for this scan.'
                        : 'No vulnerabilities found matching current filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recommendations */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-white tracking-tight">Recommendations</h2>

        <div className="space-y-2.5">
          {dynamicRecommendations.length === 0 ? (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-5 text-center text-xs text-gray-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              All recommendations addressed. No critical or high security issues detected!
            </div>
          ) : (
            dynamicRecommendations.map(rec => {
              const dot =
                rec.severity === 'Critical'
                  ? 'bg-rose-400'
                  : rec.severity === 'High'
                    ? 'bg-amber-400'
                    : 'bg-yellow-400'

              const badge =
                rec.severity === 'Critical'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : rec.severity === 'High'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'

              return (
                <div
                  key={rec.id}
                  className="bg-[#111726] border border-[#1E293B] rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                      {rec.severity}
                    </span>
                    <span className="text-xs font-medium text-white">{rec.title}</span>
                  </div>

                  <button
                    onClick={() => rec.vuln && setSelectedVuln(rec.vuln)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${rec.btnStyle}`}
                  >
                    <span>{rec.action}</span>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Interactive Fix / Remediation Modal */}
      {selectedVuln && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-[#1E293B] rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Vulnerability Remediation</h3>
              </div>
              <button
                onClick={() => setSelectedVuln(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500 block">Issue Title:</span>
                <p className="font-semibold text-white mt-0.5 text-sm">{selectedVuln.title}</p>
                {selectedVuln.raw?.cwe && selectedVuln.raw.cwe.length > 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {selectedVuln.raw.cwe.join(', ')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
                <div>
                  <span className="text-gray-500 block">File / Target:</span>
                  <span className="font-mono text-blue-400 break-all text-[11px]">{selectedVuln.raw?.file || selectedVuln.package}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Location:</span>
                  <span className="font-mono text-gray-300 text-[11px]">{selectedVuln.raw?.line ? `Line ${selectedVuln.raw.line}` : 'File level'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Severity:</span>
                  <span className={`font-bold ${selectedVuln.severity === 'Critical' ? 'text-rose-400' : 'text-amber-400'}`}>{selectedVuln.severity}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Scanner:</span>
                  <span className="text-gray-300 uppercase text-[11px]">{selectedVuln.scanner} ({selectedVuln.type})</span>
                </div>
              </div>

              {selectedVuln.raw?.message && (
                <div className="bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
                  <span className="text-gray-500 block mb-1">Diagnostic Details:</span>
                  <p className="text-gray-300 font-mono text-[11px] break-all">{selectedVuln.raw.message}</p>
                </div>
              )}

              {selectedVuln.raw?.code && (
                <div className="bg-[#0B0F19] p-3 rounded-lg border border-[#1E293B]">
                  <span className="text-gray-500 block mb-1">Code Snippet:</span>
                  <pre className="text-rose-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">{selectedVuln.raw.code}</pre>
                </div>
              )}

              <div>
                <span className="text-gray-400 font-semibold block mb-1">Recommended Fix Action:</span>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-[11px] leading-relaxed">
                  {selectedVuln.type === 'Secret'
                    ? `Immediately revoke the exposed secret detected in ${selectedVuln.package}, invalidate any active tokens in the provider console, and migrate credentials to environment variables.`
                    : selectedVuln.type === 'Dependency'
                      ? `Upgrade dependency ${selectedVuln.package} to the latest secure release to eliminate known CVEs and security advisories.`
                      : `Review line ${selectedVuln.raw?.line || '—'} in ${selectedVuln.package}. Ensure parameters are properly sanitized, parameterized, or validated against injection.`}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between">
              <button
                onClick={() => handleTriage(selectedVuln.id, 'ignored')}
                className="px-3 py-1.5 bg-[#0B0F19] border border-[#1E293B] hover:border-slate-700 text-gray-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
              >
                Ignore False Positive
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedVuln(null)}
                  className="px-3 py-1.5 text-gray-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTriage(selectedVuln.id, 'resolved')}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Mark as Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
