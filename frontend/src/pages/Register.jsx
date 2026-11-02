import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../store'
import { Button, Spinner } from '../components/ui'
import { CheckIcon, EyeIcon, EyeOffIcon } from '../components/icons'
import AuthShell, { AuthFooterLink, Field, FormError, inputClass } from './AuthShell'

const rules = [
  { test: (v) => v.length >= 8, label: 'Minimal 8 karakter' },
  { test: (v) => /[a-zA-Z]/.test(v) && /\d/.test(v), label: 'Kombinasi huruf dan angka' },
]

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setSession } = useAuth()
  const navigate = useNavigate()

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Nama wajib diisi.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Format email tidak valid.')
    if (form.password.length < 8) return setError('Password minimal 8 karakter.')

    setLoading(true)
    try {
      const data = await api.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      setSession(data)
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err.message || 'Gagal mendaftar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Buat akun GitLearn"
      subtitle="Gratis. Progres, XP, dan badge tersimpan otomatis."
      footer={<AuthFooterLink text="Sudah punya akun?" to="/login" label="Masuk" />}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError>{error}</FormError>
        <Field label="Nama lengkap" htmlFor="name">
          <input
            id="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={inputClass}
            placeholder="Rina Pratama"
            required
          />
        </Field>
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
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className={`${inputClass} pr-10`}
              placeholder="Minimal 8 karakter"
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
        <ul className="grid grid-cols-2 gap-2" aria-label="Syarat password">
          {rules.map((rule) => {
            const ok = rule.test(form.password)
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400'}`}
              >
                <CheckIcon className="h-3.5 w-3.5" /> {rule.label}
              </li>
            )
          })}
        </ul>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : null}
          {loading ? 'Membuat akun…' : 'Daftar gratis'}
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-ink-400">
          Dengan mendaftar, kamu setuju latihan dilakukan di sandbox simulasi dan bukan repository produksi.
        </p>
      </form>
    </AuthShell>
  )
}
