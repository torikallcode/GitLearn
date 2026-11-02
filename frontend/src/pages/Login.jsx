import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../store'
import { Button, Spinner } from '../components/ui'
import { EyeIcon, EyeOffIcon } from '../components/icons'
import AuthShell, { AuthFooterLink, Field, FormError, inputClass } from './AuthShell'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.email.trim() || !form.password) {
      setError('Email dan password wajib diisi.')
      return
    }
    setLoading(true)
    try {
      const data = await api.login({ email: form.email.trim(), password: form.password })
      setSession(data)
      const from = location.state?.from
      navigate(from && from !== '/login' ? from : data.user?.career_goal ? '/dashboard' : '/onboarding', { replace: true })
    } catch (err) {
      setError(err.message || 'Gagal masuk.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Selamat datang kembali"
      subtitle="Lanjutkan progres belajar Git-mu dari tempat terakhir."
      footer={<AuthFooterLink text="Belum punya akun?" to="/register" label="Daftar gratis" />}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputClass}
            placeholder="kamu@email.com"
            required
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className={`${inputClass} pr-10`}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-ink-400 hover:text-ink-600"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : null}
          {loading ? 'Memproses…' : 'Masuk'}
        </Button>
      </form>
    </AuthShell>
  )
}
