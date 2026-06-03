import { Suspense, useEffect, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
import { useAuthStore } from './store/authStore'
import { useUserStore } from './store/userStore'
import { useRecordsStore } from './store/recordsStore'
import { useUIStore, applyTheme } from './store/uiStore'
import { AppShell } from './components/layout/AppShell'
import { Spinner } from './components/ui/index'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from './components/ui/Button'

// Pages
import Landing from './pages/Landing'
import { Login, Register, OTP } from './pages/Auth'
import { Onboarding } from './pages/Onboarding.jsx'
import Dashboard from './components/dashboard/Dashboard'
import Passport from './components/passport/Passport'
import SymptomAnalyzer from './components/symptom/SymptomAnalyzer'
import Emergency from './components/emergency/Emergency'
import ReportAnalyzer from './components/reports/ReportAnalyzer'
import Medications from './components/medications/Medications'
import FeedbackAnalytics from './components/dashboard/FeedbackAnalytics'
import HealthReportGenerator from './components/dashboard/HealthReportGenerator'
import RiskPrediction from './components/dashboard/RiskPrediction'

// Doctor Portal
import { DoctorLayout } from './components/doctor/layout/DoctorLayout'
import { DoctorLogin } from './pages/doctor/auth/DoctorLogin'
import { DoctorRegister } from './pages/doctor/auth/DoctorRegister'
import { Dashboard as DoctorDashboard } from './pages/doctor/Dashboard'
import { PatientDirectory } from './pages/doctor/PatientDirectory'
import { PatientPassport as DoctorPatientPassport } from './pages/doctor/PatientPassport'
import { ActiveConsultation } from './pages/doctor/ActiveConsultation'
import { Analytics as DoctorAnalytics } from './pages/doctor/Analytics'
import { Profile as DoctorProfile } from './pages/doctor/Profile'

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-[var(--color-background)]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading oneHealth...</p>
      </div>
    </div>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-background)] p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Something went wrong</h1>
          <p className="text-[var(--color-text-secondary)] mb-6 max-w-md">
            We encountered an unexpected error. Our team has been notified.
          </p>
          <div className="bg-[var(--color-surface-2)] p-4 rounded-lg border border-[var(--color-border)] mb-6 max-w-lg w-full text-left overflow-auto text-xs text-[var(--color-text-primary)] font-mono">
            {this.state.error?.toString()}
          </div>
          <Button onClick={() => window.location.href = '/'} leftIcon={<RotateCcw size={16} />}>
            Return Home
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Route guard — redirect to /login if not authenticated
function PrivateRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isLoading = useAuthStore(s => s.isLoading)

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function Placeholder({ name }) {
  return (
    <div className="page-container py-16 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-2)] flex items-center justify-center mb-4 text-3xl">🚧</div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{name}</h1>
      <p className="text-[var(--color-text-secondary)] mt-2">This page is coming soon.</p>
    </div>
  )
}

// Auth state watcher — syncs Firebase auth state into Zustand store
function AuthWatcher() {
  const setUser = useAuthStore(s => s.setUser)
  const logout = useAuthStore(s => s.logout)
  const setLoading = useAuthStore(s => s.setLoading)
  const fetchProfile = useUserStore(s => s.fetchProfile)
  const fetchHealthMetrics = useUserStore(s => s.fetchHealthMetrics)
  const fetchRecords = useRecordsStore(s => s.fetchRecords)
  const clearProfile = useUserStore(s => s.clearProfile)
  const clearRecords = useRecordsStore(s => s.clearRecords)

  useEffect(() => {
    if (!auth) {
      console.warn('[AuthWatcher] Firebase auth not available — check .env config')
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken()
          // Import authService locally to avoid circular issues
          const { authService } = await import('./services/authService')
          const profile = await authService.getUserProfile(fbUser.uid)
          setUser(
            { uid: fbUser.uid, email: fbUser.email, name: fbUser.displayName || profile?.displayName || 'User' },
            token,
            profile?.role || 'patient'
          )
          // Load user data in parallel
          await Promise.allSettled([
            fetchProfile(fbUser.uid),
            fetchHealthMetrics(fbUser.uid),
            fetchRecords(fbUser.uid),
          ])
        } catch (err) {
          console.error('[AuthWatcher] error:', err)
        }
      } else {
        logout()
        clearProfile?.()
        clearRecords?.()
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return null
}

export default function App() {
  const theme = useUIStore(s => s.theme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthWatcher />
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/otp" element={<OTP />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/emergency/demo" element={<Emergency />} />

          {/* Doctor Public Routes */}
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor/register" element={<DoctorRegister />} />

          {/* Doctor Protected Routes */}
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="patients" element={<PatientDirectory />} />
            <Route path="patients/:id" element={<DoctorPatientPassport />} />
            <Route path="consultation" element={<Navigate to="/doctor/patients" replace />} />
            <Route path="consultation/:id" element={<ActiveConsultation />} />
            <Route path="analytics" element={<DoctorAnalytics />} />
            <Route path="profile" element={<DoctorProfile />} />
            <Route index element={<Navigate to="/doctor/dashboard" replace />} />
          </Route>

          {/* Protected patient routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<AppShell title="Dashboard" subtitle="Your health at a glance" />}>
              <Route index element={<Dashboard />} />
            </Route>
            <Route path="/passport" element={<AppShell title="Health Passport" subtitle="Your complete medical history" />}>
              <Route index element={<Passport />} />
            </Route>
            <Route path="/symptoms" element={<AppShell title="Symptom Analyzer" subtitle="AI-powered health triage" />}>
              <Route index element={<SymptomAnalyzer />} />
            </Route>
            <Route path="/emergency" element={<AppShell title="Emergency Card" subtitle="Critical information for first responders" />}>
              <Route index element={<Emergency />} />
            </Route>
            <Route path="/reports" element={<AppShell title="Report Analyzer" subtitle="AI analysis of your lab reports" />}>
              <Route index element={<ReportAnalyzer />} />
            </Route>
            <Route path="/medications" element={<AppShell title="Medications" subtitle="Track and manage your prescriptions" />}>
              <Route index element={<Medications />} />
            </Route>
            <Route path="/risk" element={<AppShell title="Risk Prediction" subtitle="AI-driven health risk assessment" />}>
              <Route index element={<RiskPrediction />} />
            </Route>
            <Route path="/feedback-analytics" element={<AppShell title="Feedback Analytics" subtitle="AI sentiment analysis" />}>
              <Route index element={<FeedbackAnalytics />} />
            </Route>
            <Route path="/health-report" element={<AppShell title="AI Health Report" subtitle="Generate your comprehensive health report" />}>
              <Route index element={<HealthReportGenerator />} />
            </Route>
            <Route path="/settings" element={<AppShell title="Settings" subtitle="Manage your account and preferences" />}>
              <Route index element={<Placeholder name="Settings" />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
