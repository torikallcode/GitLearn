import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth, useTheme } from '../store'
import { api } from '../services/api'
import Layout from './Layout'
import Landing from '../pages/Landing'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Onboarding from '../pages/Onboarding'
import Dashboard from '../pages/Dashboard'
import Paths from '../pages/Paths'
import PathDetail from '../pages/PathDetail'
import Lesson from '../pages/Lesson'
import CheatSheet from '../pages/CheatSheet'
import Profile from '../pages/Profile'
import Review from '../pages/Review'
import Certificate from '../pages/Certificate'
import NotFound from '../pages/NotFound'

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
  )
}
