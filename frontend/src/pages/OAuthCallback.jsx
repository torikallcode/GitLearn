import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../store'
import { PageLoader } from '../components/ui'

export default function OAuthCallback() {
  const { setTokens, setUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) {
      navigate('/login?oauth_error=missing_tokens', { replace: true })
      return
    }
    setTokens({ access_token: accessToken, refresh_token: refreshToken })
    api
      .me()
      .then((user) => {
        setUser(user)
        navigate(user.career_goal ? '/dashboard' : '/onboarding', { replace: true })
      })
      .catch(() => navigate('/login?oauth_error=profile_failed', { replace: true }))
  }, [navigate, setTokens, setUser])

  return <PageLoader label="Menyelesaikan login GitHub…" />
}
