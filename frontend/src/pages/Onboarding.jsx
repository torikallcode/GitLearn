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

// F-20 placement test: five quick checks that suggest a starting level.
const placementQuestions = [
  { q: 'Perintah untuk menyimpan snapshot perubahan adalah…', options: ['git add', 'git commit', 'git push', 'git clone'], correct: 1 },
  { q: 'Di mana riwayat commit tersimpan?', options: ['Folder .git', 'README.md', 'GitHub saja', 'node_modules'], correct: 0 },
  { q: 'Apa fungsi git branch?', options: ['Menghapus riwayat', 'Membuat jalur kerja paralel', 'Mengunggah file', 'Menggabungkan remote'], correct: 1 },
  { q: 'Perintah mengambil perubahan remote lalu menggabungkannya…', options: ['git fetch', 'git pull', 'git push', 'git remote'], correct: 1 },
  { q: 'Untuk membatalkan commit tanpa menghapus riwayat, gunakan…', options: ['git reset --hard', 'git revert', 'git clean', 'git rm'], correct: 1 },
]

export default function Onboarding() {
  const { user, setUser } = useAuth()
  const [goal, setGoal] = useState(user?.career_goal || '')
  const [level, setLevel] = useState(user?.level || 'beginner')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState({})
  const navigate = useNavigate()

  const answered = Object.keys(answers).length
  const placementScore = placementQuestions.reduce(
    (total, question, index) => total + (answers[index] === question.correct ? 1 : 0),
    0,
  )

  function applyPlacement() {
    if (answered < placementQuestions.length) return
    setLevel(placementScore >= 4 ? 'advanced' : placementScore >= 2 ? 'intermediate' : 'beginner')
  }

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

        <fieldset>
          <legend className="mb-3 text-sm font-bold text-ink-800 dark:text-ink-100">
            3. Tes penempatan <span className="font-normal text-ink-400">(opsional)</span>
          </legend>
          <div className="space-y-4">
            {placementQuestions.map((question, index) => (
              <div key={question.q} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
                <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">
                  {index + 1}. {question.q}
                </p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <label
                      key={option}
                      className={cx(
                        'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                        answers[index] === optionIndex
                          ? 'border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
                          : 'border-ink-200 dark:border-ink-700',
                      )}
                    >
                      <input
                        type="radio"
                        name={`placement-${index}`}
                        checked={answers[index] === optionIndex}
                        onChange={() => setAnswers((prev) => ({ ...prev, [index]: optionIndex }))}
                        className="h-3.5 w-3.5 accent-brand-600"
                      />
                      <span className="text-ink-700 dark:text-ink-200">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={applyPlacement} disabled={answered < placementQuestions.length}>
              Terapkan hasil
            </Button>
            <span className="text-xs text-ink-400">
              {answered}/{placementQuestions.length} dijawab
              {answered === placementQuestions.length ? ` · skor ${placementScore}/${placementQuestions.length}` : ''}
            </span>
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
