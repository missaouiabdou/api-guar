import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

// Attach Bearer token to all outgoing API requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('guardrail_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Automatically extract & store token from login response, handle 401s
api.interceptors.response.use(
  response => {
    const authHeader = response.headers['authorization'] || response.headers['Authorization']
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '')
      localStorage.setItem('guardrail_token', token)
    }
    return response
  },
  error => {
    if (error.response?.status === 401) {
      // Clear token on authentication failure
      localStorage.removeItem('guardrail_token')
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth Endpoints ──────────────────────────────────────────────────────────
export const loginUser = (credentials) =>
  api.post('/login', { user: credentials }).then(res => {
    const token = (res.headers['authorization'] || res.headers['Authorization'] || '').replace(/^Bearer\s+/i, '')
    if (token) localStorage.setItem('guardrail_token', token)
    if (res.data?.user) localStorage.setItem('guardrail_user', JSON.stringify(res.data.user))
    return res
  })

export const signupUser = (credentials) =>
  api.post('/signup', { user: credentials }).then(res => {
    const token = (res.headers['authorization'] || res.headers['Authorization'] || '').replace(/^Bearer\s+/i, '')
    if (token) localStorage.setItem('guardrail_token', token)
    if (res.data?.user) localStorage.setItem('guardrail_user', JSON.stringify(res.data.user))
    return res
  })

export const logoutUser = () =>
  api.delete('/logout').finally(() => {
    localStorage.removeItem('guardrail_token')
    localStorage.removeItem('guardrail_user')
  })

// ── Dashboard Aggregates Endpoint ───────────────────────────────────────────
export const fetchDashboard = () => api.get('/dashboard')

// ── Repositories Endpoints ──────────────────────────────────────────────────
export const fetchRepositories = (params) => api.get('/repositories', { params })
export const fetchRepository = (id) => api.get(`/repositories/${id}`)
export const createRepository = (data) => api.post('/repositories', { repository: data })
export const deleteRepository = (id) => api.delete(`/repositories/${id}`)

// ── Projects Endpoints ──────────────────────────────────────────────────────
export const fetchProjects = () => api.get('/projects')
export const fetchProject = (id) => api.get(`/projects/${id}`)
export const createProject = (data) => api.post('/projects', { project: data })

// ── Scans Endpoints ─────────────────────────────────────────────────────────
export const fetchScans = () => api.get('/scans')
export const fetchScan = (id) => api.get(`/scans/${id}`)

// ── Security & Score Endpoints ──────────────────────────────────────────────
export const fetchScanSecurity = (scanId) => api.get(`/scans/${scanId}/security_summary`)
export const fetchProjectSecurity = (projectId) => api.get(`/projects/${projectId}/security`)

// ── Vulnerabilities Endpoints ───────────────────────────────────────────────
export const fetchVulnerabilities = (params) => api.get('/vulnerabilities', { params })
export const fetchVulnerability = (id) => api.get(`/vulnerabilities/${id}`)
export const fetchScanVulnerabilities = (scanId, params) => api.get(`/scans/${scanId}/vulnerabilities`, { params })
export const updateVulnerability = (id, data) => api.patch(`/vulnerabilities/${id}`, { vulnerability: data })
