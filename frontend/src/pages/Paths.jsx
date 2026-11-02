import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../store'
import { Badge, Card, LinkButton, PageLoader, ProgressBar, SectionTitle, cx } from '../components/ui'
import {
  ArrowRightIcon,
  BookIcon,
  BranchIcon,
  CheckCircleIcon,
  CodeIcon,
  MapIcon,
  TargetIcon,
  TrophyIcon,
} from '../components/icons'

const trackMeta = {
  core: { label: 'Wajib semua', tone: 'brand', icon: BookIcon },
  collab: { label: 'Kolaborasi', tone: 'emerald', icon: BranchIcon },
  pro: { label: 'Lanjutan', tone: 'amber', icon: TrophyIcon },
  frontend: { label: 'Karier frontend', tone: 'brand', icon: CodeIcon },
  backend: { label: 'Karier backend', tone: 'emerald', icon: TargetIcon },
}

const filters = [
  { id: 'all', label: 'Semua jalur' },
  { id: 'core', label: 'Inti & kolaborasi' },
  { id: 'career', label: 'Karier' },
]

export default function Paths() {
  const { accessToken } = useAuth()
  const [filter, setFilter] = useState('all')
  const { data: paths, isLoading, error } = useQuery({ queryKey: ['paths'], queryFn: api.paths })

  if (isLoading) return <PageLoader label="Memuat jalur belajar…" />
  if (error) return <p className="px-4 py-16 text-center text-sm text-red-500">{error.message}</p>

  const filtered = (paths || []).filter((path) => {
    if (filter === 'career') return ['frontend', 'backend'].includes(path.track)
    if (filter === 'core') return ['core', 'collab', 'pro'].includes(path.track)
    return true
  })
  const core = filtered.filter((p) => !['frontend', 'backend'].includes(p.track))
  const career = filtered.filter((p) => ['frontend', 'backend'].includes(p.track))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Kurikulum</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">Jalur belajar GitLearn</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              Urutan yang disarankan: <strong className="text-ink-700 dark:text-ink-200">Fundamental → Kolaborasi → Profesional</strong>,
              lalu pilih jalur karier frontend atau backend. Setiap lesson punya teori singkat, praktik, dan kuis.
            </p>
          </div>
          {!accessToken && (
            <LinkButton to="/register" size="lg">
              Daftar untuk menyimpan progres
            </LinkButton>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter jalur">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === f.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {core.length > 0 && (
        <section className="mt-10">
          <SectionTitle title="Jalur inti" description="Fondasi yang wajib dikuasai sebelum workflow tim." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {core.map((path, index) => (
              <PathCard key={path.slug} path={path} index={index} />
            ))}
          </div>
        </section>
      )}

      {career.length > 0 && (
        <section className="mt-12">
          <SectionTitle
            title="Jalur karier"
            description="Spesialisasi opsional. Pilih sesuai target pekerjaanmu — bisa keduanya."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {career.map((path, index) => (
              <PathCard key={path.slug} path={path} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function PathCard({ path, index }) {
  const meta = trackMeta[path.track] || trackMeta.core
  const Icon = meta.icon
  return (
    <Link to={`/paths/${path.slug}`} className="group block h-full">
      <Card className="relative flex h-full flex-col overflow-hidden p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-md dark:group-hover:border-brand-700">
        <span className="absolute right-4 top-4 font-mono text-xs font-bold text-ink-200 dark:text-ink-800">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <Icon className="h-5 w-5" />
          </span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <h3 className="mt-3 text-lg font-bold text-ink-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
          {path.title}
        </h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{path.description}</p>
        <div className="mt-4 flex items-center justify-between text-[11px] text-ink-400">
          <span>{path.module_count} modul · {path.lesson_count} lesson</span>
          <span className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400">
            {path.progress_percent > 0 ? 'Lanjutkan' : 'Mulai'} <ArrowRightIcon className="h-3 w-3" />
          </span>
        </div>
        <ProgressBar value={path.progress_percent || 0} className="mt-2" />
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-400">
          {path.progress_percent >= 100 ? (
            <>
              <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" /> Selesai
            </>
          ) : (
            `${path.completed_lessons || 0}/${path.lesson_count} lesson selesai`
          )}
        </p>
      </Card>
    </Link>
  )
}
