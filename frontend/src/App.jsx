import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RepositoriesPage from './pages/RepositoriesPage'
import ProjectsPage from './pages/ProjectsPage'
import SecurityPage from './pages/SecurityPage'
import VulnerabilitiesPage from './pages/VulnerabilitiesPage'
import ScansPage from './pages/ScansPage'
import { useAuth } from './auth/AuthContext'

// Redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// Redirects to /dashboard if already logged in
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

function GenericPage({ title, description }) {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-gray-400 text-sm mt-1">{description}</p>
      </div>
      <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-12 text-center text-gray-400">
        <div className="max-w-md mx-auto space-y-2">
          <p className="text-base font-semibold text-gray-300">Live {title} Stream Active</p>
          <p className="text-xs text-gray-500">Connected to GuardRail DevSecOps automated webhook and pipeline runner.</p>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public route — login/signup */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected routes — require authentication */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/repositories" element={<RepositoriesPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/vulnerabilities" element={<VulnerabilitiesPage />} />
                <Route path="/scans" element={<ScansPage />} />
                <Route path="/webhooks" element={<GenericPage title="Webhook Management" description="Monitor and configure GitHub and GitLab webhook endpoints" />} />
                <Route path="/events" element={<GenericPage title="Event Logs" description="Real-time delivery logs and signature verification audits" />} />
                <Route path="/deployments" element={<GenericPage title="Deployments" description="CI/CD deployment runs and release security gates" />} />
                <Route path="/pipelines" element={<GenericPage title="Pipelines" description="Automated security scanning pipeline orchestration" />} />
                <Route path="/audit" element={<GenericPage title="Audit Logs" description="System compliance and user action trail" />} />
                <Route path="/settings" element={<GenericPage title="Settings" description="Organization settings, API keys, and notification channels" />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
