import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../store'
import { Badge, Button, Card, LinkButton, PageLoader, ProgressBar, Stat } from '../components/ui'
import { achievementEmoji, formatDate } from '../utils/format'
import {
  AwardIcon,
  BookIcon,
  BranchIcon,
  CheckCircleIcon,
  CodeIcon,
  FlameIcon,
  LogOutIcon,
  SparklesIcon,
  TargetIcon,
  TrophyIcon,
  UserIcon,
  ZapIcon,
} from '../components/icons'

const goals = [
  { id: 'frontend', label: 'Frontend Engineer' },
  { id: 'backend', label: 'Backend Engineer' },
  { id: '', label: 'Belum menentukan' },
]
const levels = [
  { id: 'beginner', label: 'Pemula total' },
  { id: 'intermediate', label: 'Sudah pernah commit' },
  { id: 'advanced', label: 'Cukup percaya diri' },
]

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: user?.name || '',
    career_goal: user?.career_goal || '',
    level: user?.level || 'beginner',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['stats'], queryFn: api.stats })
  const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: api.progress })

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await api.updateMe(form)
      setUser(updated)
      setMessage('Profil berhasil diperbarui.')
      queryClient.invalidateQueries({ queryKey: ['progress'] })
    } catch (err) {
      setError(err.message || 'Gagal menyimpan profil.')
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (statsLoading) return <PageLoader label="Memuat profil…" />

  const badges = stats?.badges || progress?.badges || []
  const completion = Math.round(progress?.completion_percent || 0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-3xl font-extrabold text-white shadow-lg shadow-brand-600/20">
            {(user?.name || 'G').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">{user?.name}</h1>
              {user?.career_goal && (
                <Badge tone="brand">{user.career_goal === 'frontend' ? 'Frontend track' : 'Backend track'}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-500">{user?.email}</p>
            <p className="mt-1 text-xs text-ink-400">
              Bergabung {formatDate(user?.created_at)} · Level: {levels.find((l) => l.id === user?.level)?.label || 'Pemula total'}
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton to="/certificate" variant="secondary" size="sm">
              <AwardIcon className="h-4 w-4" /> Sertifikat
            </LinkButton>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOutIcon className="h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-600 dark:text-ink-300">Penyelesaian kurikulum</span>
            <span className="text-ink-400">{completion}%</span>
          </div>
          <ProgressBar value={completion} className="mt-2" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="XP" value={stats?.xp || 0} icon={<ZapIcon className="h-5 w-5" />} tone="amber" />
        <Stat label="Streak" value={`${stats?.current_streak || 0} hari`} hint={`Terpanjang ${stats?.longest_streak || 0}`} icon={<FlameIcon className="h-5 w-5" />} tone="emerald" />
        <Stat label="Lesson selesai" value={progress?.lessons_completed || 0} hint={`dari ${progress?.lessons_total || 0}`} icon={<BookIcon className="h-5 w-5" />} />
        <Stat label="Badge" value={badges.length} icon={<TrophyIcon className="h-5 w-5" />} tone="violet" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900 dark:text-white">
            <UserIcon className="h-5 w-5 text-brand-500" /> Pengaturan profil
          </h2>
          <form onSubmit={save} className="mt-5 space-y-4">
            {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{message}</p>}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-ink-700 dark:text-ink-200">Nama</label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
              />
            </div>
            <div>
              <label htmlFor="career" className="mb-1.5 block text-sm font-semibold text-ink-700 dark:text-ink-200">Target karier</label>
              <select
                id="career"
                value={form.career_goal}
                onChange={(e) => setForm((f) => ({ ...f, career_goal: e.target.value }))}
                className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="level" className="mb-1.5 block text-sm font-semibold text-ink-700 dark:text-ink-200">Level</label>
              <select
                id="level"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
              >
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan perubahan'}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900 dark:text-white">
              <TrophyIcon className="h-5 w-5 text-amber-500" /> Badge
            </h2>
            {badges.length ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {badges.map((badge) => (
                  <div key={badge.code} className="rounded-xl border border-ink-100 p-3 text-center dark:border-ink-800">
                    <p className="text-2xl">{achievementEmoji(badge.code)}</p>
                    <p className="mt-1 text-[11px] font-bold text-ink-800 dark:text-ink-100">{badge.name}</p>
                    <p className="mt-0.5 text-[9px] leading-tight text-ink-400">{badge.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-400">Belum ada badge. Selesaikan lesson pertama untuk memulai.</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900 dark:text-white">
              <SparklesIcon className="h-5 w-5 text-brand-500" /> Langkah berikutnya
            </h2>
            {progress?.next_lesson ? (
              <>
                <p className="mt-2 text-sm font-semibold text-ink-800 dark:text-ink-100">{progress.next_lesson.title}</p>
                <p className="mt-0.5 text-xs text-ink-400">{progress.next_lesson.path_title} · {progress.next_lesson.module_title}</p>
                <LinkButton to={`/lessons/${progress.next_lesson.slug}`} size="sm" className="mt-3 w-full">
                  Lanjut belajar
                </LinkButton>
              </>
            ) : (
              <p className="mt-2 text-xs text-ink-400">Semua lesson inti selesai. Eksplor jalur karier atau review kuis.</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <LinkButton to="/review" variant="secondary" size="sm">Review</LinkButton>
              <LinkButton to="/paths" variant="secondary" size="sm">Jalur</LinkButton>
            </div>
          </Card>
        </div>
      </div>

      {user?.career_goal && (
        <Card className="mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
                {user.career_goal === 'frontend' ? <CodeIcon className="h-4 w-4 text-brand-500" /> : <TargetIcon className="h-4 w-4 text-emerald-500" />}
                Jalur karier {user.career_goal === 'frontend' ? 'Frontend' : 'Backend'}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Lanjutkan spesialisasi untuk menyiapkan portofolio dan workflow kerja tim.
              </p>
            </div>
            <LinkButton to={`/paths/karier-${user.career_goal}`} size="sm" variant="secondary">
              Buka jalur <BranchIcon className="h-4 w-4" />
            </LinkButton>
          </div>
        </Card>
      )}

      <div className="mt-6 flex justify-center">
        <Link to="/paths" className="text-xs text-ink-400 hover:text-ink-600">
          <CheckCircleIcon className="mr-1 inline h-3.5 w-3.5" /> Progress tersimpan otomatis setiap menyelesaikan lesson
        </Link>
      </div>
    </div>
  )
}
