import { useState, useEffect } from 'react'
import {
  User,
  Building2,
  Users,
  Bell,
  Key,
  Shield,
  Plug,
  Check,
  Search,
  ExternalLink,
  Save,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react'
import {
  fetchProjects,
  fetchSecurityPolicies,
  createSecurityPolicy,
  updateSecurityPolicy,
  deleteSecurityPolicy,
  fetchProfile,
  updateProfile
} from '../api/client'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile')
  const [searchTerm, setSearchTerm] = useState('')

  // Profile Form State
  const [profile, setProfile] = useState(() => {
    let saved = {
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah.chen@acme.com',
      jobTitle: 'Platform Engineering Lead',
      timezone: 'America/New_York (UTC-5)'
    }
    try {
      const stored = localStorage.getItem('guardrail_user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.email) {
          saved.email = u.email
          const parts = u.email.split('@')[0].split('.')
          saved.firstName = parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1) || 'Sarah'
          saved.lastName = parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1) || 'Chen'
        }
      }
    } catch (e) {}
    return saved
  })

  const [savedSuccess, setSavedSuccess] = useState(false)

  // Integrations State
  const [integrations, setIntegrations] = useState([
    {
      id: 'github',
      name: 'GitHub',
      description: 'Source control and CI integration',
      connected: true,
      iconType: 'github'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Alert notifications and deployments',
      connected: true,
      iconType: 'slack'
    },
    {
      id: 'pagerduty',
      name: 'PagerDuty',
      description: 'On-call incident management',
      connected: false,
      iconType: 'pagerduty'
    },
    {
      id: 'datadog',
      name: 'Datadog',
      description: 'Metrics, logs and APM',
      connected: false,
      iconType: 'datadog'
    },
    {
      id: 'snyk',
      name: 'Snyk',
      description: 'Vulnerability scanning for dependencies',
      connected: true,
      iconType: 'snyk'
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Issue tracking and project management',
      connected: false,
      iconType: 'jira'
    }
  ])

  // Security Policies State
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [policies, setPolicies] = useState([])
  const [editingPolicy, setEditingPolicy] = useState(null)

  useEffect(() => {
    fetchProjects().then(res => {
      const list = res.data?.data || res.data || []
      setProjects(list)
      if (list.length > 0) setSelectedProjectId(list[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProjectId) return
    fetchSecurityPolicies(selectedProjectId).then(res => {
      setPolicies(res.data?.policies || [])
    }).catch(() => {})
  }, [selectedProjectId])

  useEffect(() => {
    fetchProfile()
      .then(res => {
        const u = res.data?.data
        if (u) {
          setProfile({
            firstName: u.first_name || 'Sarah',
            lastName: u.last_name || 'Chen',
            email: u.email || 'sarah.chen@acme.com',
            jobTitle: u.job_title || 'Platform Engineering Lead',
            timezone: u.timezone || 'America/New_York (UTC-5)',
            apiToken: u.api_token
          })
        }
      })
      .catch(() => {})
  }, [])

  const toggleIntegration = (id) => {
    setIntegrations(prev => prev.map(item =>
      item.id === id ? { ...item, connected: !item.connected } : item
    ))
  }

  const handleProfileSave = (e) => {
    e.preventDefault()
    updateProfile({
      first_name: profile.firstName,
      last_name: profile.lastName,
      job_title: profile.jobTitle,
      timezone: profile.timezone
    })
      .then(() => {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
        try {
          localStorage.setItem('guardrail_user', JSON.stringify({
            email: profile.email,
            name: `${profile.firstName} ${profile.lastName}`
          }))
        } catch (e) {}
      })
      .catch(err => {
        alert(err?.response?.data?.errors?.join(', ') || 'Failed to save profile changes')
      })
  }

  const tabs = [
    { id: 'Profile', label: 'Profile', icon: User },
    { id: 'Organization', label: 'Organization', icon: Building2 },
    { id: 'Team & Access', label: 'Team & Access', icon: Users },
    { id: 'Notifications', label: 'Notifications', icon: Bell },
    { id: 'API Keys', label: 'API Keys', icon: Key },
    { id: 'Security', label: 'Security', icon: Shield },
    { id: 'Integrations', label: 'Integrations', icon: Plug }
  ]

  const renderIntegrationIcon = (type) => {
    switch (type) {
      case 'github':
        return (
          <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-white">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </div>
        )
      case 'slack':
        return (
          <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-amber-400">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
          </div>
        )
      case 'pagerduty':
        return (
          <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-emerald-400 font-bold text-xs">
            PD
          </div>
        )
      case 'datadog':
        return (
          <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-purple-400 font-bold text-xs">
            DD
          </div>
        )
      case 'snyk':
        return (
          <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-blue-400 font-bold text-xs">
            SN
          </div>
        )
      case 'jira':
        return (
          <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-cyan-400 font-bold text-xs">
            JR
          </div>
        )
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex items-center justify-center text-gray-400">
            <Plug className="w-5 h-5" />
          </div>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-gray-400 text-xs mt-0.5">Manage your account, organization, and integrations</p>
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
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase">
            {profile.firstName[0]}{profile.lastName[0]}
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sub-navigation */}
        <div className="md:col-span-1 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#111726]'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right Content Panel */}
        <div className="md:col-span-3">
          {/* TAB 1: Profile (Image 5) */}
          {activeTab === 'Profile' && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-white">Profile</h2>
                <p className="text-xs text-gray-400 mt-0.5">Manage your personal information and preferences.</p>
              </div>

              {/* Avatar Section */}
              <div className="flex items-center gap-4 pt-2">
                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold text-white uppercase shadow-md">
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{profile.firstName} {profile.lastName}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <button type="button" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                      Change avatar
                    </button>
                    <span className="text-gray-600">&bull;</span>
                    <button type="button" className="text-gray-400 hover:text-rose-400 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleProfileSave} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-300 block mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-300 block mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-300 block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={e => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-300 block mb-1.5">Job Title</label>
                    <input
                      type="text"
                      value={profile.jobTitle}
                      onChange={e => setProfile({ ...profile, jobTitle: e.target.value })}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1.5">Timezone</label>
                  <select
                    value={profile.timezone}
                    onChange={e => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="America/New_York (UTC-5)">America/New_York (UTC-5)</option>
                    <option value="Europe/London (UTC+0)">Europe/London (UTC+0)</option>
                    <option value="Europe/Paris (UTC+1)">Europe/Paris (UTC+1)</option>
                    <option value="Asia/Tokyo (UTC+9)">Asia/Tokyo (UTC+9)</option>
                    <option value="America/Los_Angeles (UTC-8)">America/Los_Angeles (UTC-8)</option>
                  </select>
                </div>

                {savedSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Profile settings saved successfully!</span>
                  </div>
                )}

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="px-4 py-2 bg-[#0B0F19] border border-[#1E293B] hover:border-slate-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Integrations (Image 4) */}
          {activeTab === 'Integrations' && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-white">Integrations</h2>
                <p className="text-xs text-gray-400 mt-0.5">Connect GuardRail with your favorite tools.</p>
              </div>

              <div className="space-y-3 pt-2">
                {integrations.map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#0B0F19]/60 border border-[#1E293B] hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      {renderIntegrationIcon(item.iconType)}
                      <div>
                        <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleIntegration(item.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        item.connected
                          ? 'bg-[#111726] border border-[#1E293B] hover:border-rose-500/50 hover:text-rose-400 text-gray-300'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {item.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Security & Policies (Priority 7) */}
          {activeTab === 'Security' && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Security Policies & Guardrail Gates</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Automated release gate rules for CI/CD pipelines and commit status checks</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {policies.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs bg-[#0B0F19] rounded-xl border border-[#1E293B]">
                    No custom security policies configured yet. GuardRail standard production policy is active.
                  </div>
                ) : (
                  policies.map(policy => (
                    <div
                      key={policy.id}
                      className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-white">{policy.name}</h4>
                          <p className="text-xs text-gray-400">{policy.description || 'Standard project security threshold'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          policy.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {policy.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-[#111726] p-2.5 rounded-lg border border-[#1E293B]">
                          <span className="text-gray-500 block text-[11px]">Min Score</span>
                          <span className="text-white font-bold text-sm">{policy.minimum_security_score}/100</span>
                        </div>
                        <div className="bg-[#111726] p-2.5 rounded-lg border border-[#1E293B]">
                          <span className="text-gray-500 block text-[11px]">Max Critical</span>
                          <span className="text-white font-bold text-sm">{policy.maximum_critical}</span>
                        </div>
                        <div className="bg-[#111726] p-2.5 rounded-lg border border-[#1E293B]">
                          <span className="text-gray-500 block text-[11px]">Fail on Secrets</span>
                          <span className={`font-bold text-sm ${policy.fail_on_secrets ? 'text-rose-400' : 'text-gray-400'}`}>
                            {policy.fail_on_secrets ? 'Enforced' : 'Off'}
                          </span>
                        </div>
                        <div className="bg-[#111726] p-2.5 rounded-lg border border-[#1E293B]">
                          <span className="text-gray-500 block text-[11px]">Block Release</span>
                          <span className={`font-bold text-sm ${policy.block_on_failure ? 'text-amber-400' : 'text-gray-400'}`}>
                            {policy.block_on_failure ? 'Blocking' : 'Advisory'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: API Keys */}
          {activeTab === 'API Keys' && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">API Keys & Tokens</h2>
                <p className="text-xs text-gray-400 mt-0.5">Authenticate external CI/CD pipelines and tools with GuardRail</p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">CI/CD Pipeline Key</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-400 bg-[#111726] px-3 py-1.5 rounded-lg border border-[#1E293B] flex-1">
                    gr_live_89a0b1c2d3e4f5g6h7i8j9k0l1m2n3
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText('gr_live_89a0b1c2d3e4f5g6h7i8j9k0l1m2n3')}
                    className="px-3 py-1.5 bg-[#111726] hover:bg-blue-600/20 text-blue-400 border border-[#1E293B] rounded-lg text-xs font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5, 6, 7: Generic Other Tabs */}
          {['Organization', 'Team & Access', 'Notifications'].includes(activeTab) && (
            <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">{activeTab}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Manage your organization preferences and team access permissions.</p>
              </div>

              <div className="p-8 text-center text-gray-400 text-xs bg-[#0B0F19] rounded-xl border border-[#1E293B] space-y-2">
                <p className="font-semibold text-white">Configured for Acme Corp Enterprise</p>
                <p className="text-gray-500">Connected with SSO & Role-Based Access Control.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
