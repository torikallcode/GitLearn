import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth, useTheme } from '../store'
import { api } from '../services/api'
import { PageLoader } from '../components/ui'
import Layout from './Layout'
import Landing from '../pages/Landing'
import NotFound from '../pages/NotFound'

const Login = lazy(() => import('../pages/Login'))
const Register = lazy(() => import('../pages/Register'))
const Onboarding = lazy(() => import('../pages/Onboarding'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Paths = lazy(() => import('../pages/Paths'))
const PathDetail = lazy(() => import('../pages/PathDetail'))
const Lesson = lazy(() => import('../pages/Lesson'))
const CheatSheet = lazy(() => import('../pages/CheatSheet'))
const Profile = lazy(() => import('../pages/Profile'))
const Review = lazy(() => import('../pages/Review'))
const Certificate = lazy(() => import('../pages/Certificate'))
const PublicCertificate = lazy(() => import('../pages/PublicCertificate'))

function Protected({ children }) {
  const { accessToken } = useAuth()
  const location = useLocation()
  if (!accessToken) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

function GuestOnly({ children }) {
  const { accessToken } = useAuth()
  return accessToken ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  const { accessToken, setUser, logout } = useAuth()
  const { init } = useTheme()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    api
      .me()
      .then((user) => !cancelled && setUser(user))
      .catch(() => !cancelled && logout())
    return () => {
      cancelled = true
    }
  }, [accessToken, setUser, logout])

  return (
    <Suspense fallback={<PageLoader label="Memuat halaman…" />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route
            path="login"
            element={
              <GuestOnly>
                <Login />
              </GuestOnly>
            }
          />
          <Route
            path="register"
            element={
              <GuestOnly>
                <Register />
              </GuestOnly>
            }
          />
          <Route
            path="onboarding"
            element={
              <Protected>
                <Onboarding />
              </Protected>
            }
          />
          <Route
            path="dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route path="paths" element={<Paths />} />
          <Route path="paths/:slug" element={<PathDetail />} />
          <Route path="lessons/:slug" element={<Lesson />} />
          <Route path="cheatsheet" element={<CheatSheet />} />
          <Route path="certificate/:code" element={<PublicCertificate />} />
          <Route
            path="review"
            element={
              <Protected>
                <Review />
              </Protected>
            }
          />
          <Route
            path="profile"
            element={
              <Protected>
                <Profile />
              </Protected>
            }
          />
          <Route
            path="certificate"
            element={
              <Protected>
                <Certificate />
              </Protected>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
