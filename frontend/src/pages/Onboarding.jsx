import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../store'
import { Button, Card, cx, Spinner } from '../components/ui'
import { ArrowRightIcon, CheckIcon, CodeIcon, SparklesIcon, TargetIcon } from '../components/icons'
import { FormError } from './AuthShell'

const goals = [
  {
    id: 'frontend',
    title: 'Frontend Engineer',
    description: 'Deploy UI, Conventional Commits, CI lint/test/build, review PR komponen.',
    icon: CodeIcon,
  },
  {
    id: 'backend',
    title: 'Backend Engineer',
    description: 'Branching service, migrasi DB, versioning API, CI Go + Docker.',
    icon: TargetIcon,
  },
]

const levels = [
  { id: 'beginner', title: 'Pemula total', description: 'Belum pernah memakai Git.' },
  { id: 'intermediate', title: 'Sudah pernah commit', description: 'Paham add/commit/push, ingin lebih rapi.' },
  { id: 'advanced', title: 'Cukup percaya diri', description: 'Ingin workflow tim dan topik lanjutan.' },
]

export default function Onboarding() {
  const { user, setUser } = useAuth()
  const [goal, setGoal] = useState(user?.career_goal || '')
  const [level, setLevel] = useState(user?.level || 'beginner')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    if (!goal) return setError('Pilih target karier dulu supaya rekomendasinya tepat.')
    setError('')
    setLoading(true)
    try {
      const updated = await api.updateMe({ career_goal: goal, level })
      setUser(updated)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pilihan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          <SparklesIcon className="h-3.5 w-3.5" /> Personalisasi
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
          Mau jadi engineer seperti apa?
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500 dark:text-ink-400">
          Pilihan ini menentukan jalur karier opsional dan rekomendasi lesson. Kamu tetap bisa mengubahnya nanti di
          profil.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        <FormError>{error}</FormError>

        <fieldset>
          <legend className="mb-3 text-sm font-bold text-ink-800 dark:text-ink-100">1. Target karier</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {goals.map(({ id, title, description, icon: Icon }) => {
              const active = goal === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setGoal(id)}
                  aria-pressed={active}
                  className={cx(
                    'relative rounded-2xl border p-5 text-left transition-all',
                    active
                      ? 'border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-500 dark:bg-brand-900/20'
                      : 'border-ink-200 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700',
                  )}
                >
                  {active && (
                    <span className="absolute right-4 top-4 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                  )}
                  <span
                    className={cx(
                      'grid h-10 w-10 place-items-center rounded-xl',
                      active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-bold text-ink-900 dark:text-white">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{description}</p>
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-bold text-ink-800 dark:text-ink-100">2. Level awal</legend>
          <div className="space-y-2">
            {levels.map(({ id, title, description }) => (
              <button
                key={id}
                type="button"
                onClick={() => setLevel(id)}
                aria-pressed={level === id}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                  level === id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-ink-200 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900',
                )}
              >
                <span
                  className={cx(
                    'grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
                    level === id ? 'border-brand-600' : 'border-ink-300 dark:border-ink-600',
                  )}
                >
                  {level === id && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-900 dark:text-white">{title}</span>
                  <span className="block text-xs text-ink-500 dark:text-ink-400">{description}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-xs font-medium text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
          >
            Lewati untuk sekarang
          </button>
          <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
            {loading ? <Spinner className="h-4 w-4" /> : null}
            {loading ? 'Menyimpan…' : 'Mulai belajar'}
            {!loading && <ArrowRightIcon className="h-4 w-4" />}
          </Button>
        </div>
      </form>

      <Card className="mt-8 border-dashed p-4">
        <p className="text-center text-xs text-ink-400">
          Bingung memilih? Mulai dari <strong className="text-ink-600 dark:text-ink-300">Pemula total</strong> — kamu
          bisa mempercepat dengan menyelesaikan lesson lebih cepat.
        </p>
      </Card>
    </div>
  )
}
