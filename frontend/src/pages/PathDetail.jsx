import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { Badge, Card, EmptyState, LinkButton, PageLoader, ProgressBar, cx } from '../components/ui'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookIcon,
  CheckCircleIcon,
  ClockIcon,
  LockIcon,
  PlayIcon,
  TerminalIcon,
} from '../components/icons'
import { statusLabel } from '../utils/format'

export default function PathDetail() {
  const { slug } = useParams()
  const { data, isLoading, error } = useQuery({ queryKey: ['path', slug], queryFn: () => api.path(slug) })

  if (isLoading) return <PageLoader label="Memuat jalur…" />
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Jalur tidak ditemukan"
          description={error.message}
          action={<LinkButton to="/paths">Kembali ke daftar jalur</LinkButton>}
        />
      </div>
    )
  }

  const { path, modules = [] } = data
  const nextLesson = modules.flatMap((m) => m.lessons || []).find((l) => !l.locked && l.status !== 'completed')
  const firstLesson = modules.flatMap((m) => m.lessons || []).find((l) => !l.locked) || modules[0]?.lessons?.[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/paths"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" /> Semua jalur
      </Link>

      <div className="mt-5 rounded-3xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <Badge tone="brand">{path.track === 'core' ? 'Jalur wajib' : path.track === 'frontend' || path.track === 'backend' ? 'Jalur karier' : 'Lanjutan'}</Badge>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">{path.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{path.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-400">
              <span className="inline-flex items-center gap-1.5">
                <BookIcon className="h-4 w-4" /> {path.module_count} modul
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TerminalIcon className="h-4 w-4" /> {path.lesson_count} lesson
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" /> ± {Math.max(10, path.lesson_count * 8)} menit
              </span>
            </div>
          </div>
          <LinkButton to={`/lessons/${(nextLesson || firstLesson)?.slug}`} size="lg">
            <PlayIcon className="h-4 w-4" /> {path.progress_percent > 0 ? 'Lanjutkan' : 'Mulai jalur'}
          </LinkButton>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-600 dark:text-ink-300">Progres jalur</span>
            <span className="text-ink-400">
              {path.completed_lessons || 0}/{path.lesson_count} lesson · {Math.round(path.progress_percent || 0)}%
            </span>
          </div>
          <ProgressBar value={path.progress_percent || 0} className="mt-2" />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {modules.map((mod, modIndex) => (
          <Card key={mod.id} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 dark:border-ink-800">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-100 text-xs font-bold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                  {String(mod.order_no).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink-900 dark:text-white">{mod.title}</h2>
                  <p className="text-xs text-ink-400">{mod.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-400">
                <span>
                  {mod.completed_lessons}/{mod.lesson_count}
                </span>
                <div className="w-20">
                  <ProgressBar value={mod.progress_percent} className="h-1.5" />
                </div>
              </div>
            </div>
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {(mod.lessons || []).map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    to={`/lessons/${lesson.slug}`}
                    className={cx(
                      'flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50',
                      lesson.status === 'completed' && 'bg-emerald-50/40 dark:bg-emerald-900/10',
                    )}
                  >
                    <span
                      className={cx(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full',
                        lesson.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : lesson.locked
                            ? 'bg-ink-100 text-ink-400 dark:bg-ink-800'
                            : 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300',
                      )}
                    >
                      {lesson.status === 'completed' ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : lesson.locked ? (
                        <LockIcon className="h-3.5 w-3.5" />
                      ) : (
                        <PlayIcon className="h-3 w-3" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                        {lesson.title}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-ink-400">
                        <span>{statusLabel(lesson.status)}</span>
                        <span>·</span>
                        <span>{lesson.estimated_minutes} menit</span>
                        {lesson.quiz_total > 0 && (
                          <>
                            <span>·</span>
                            <span>
                              Kuis {lesson.quiz_score}/{lesson.quiz_total}
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                    {lesson.locked ? (
                      <span className="text-[10px] font-medium text-ink-400">Selesaikan sebelumnya</span>
                    ) : (
                      <ArrowRightIcon className="h-4 w-4 text-ink-300" />
                    )}
                  </Link>
                </li>
              ))}
              {!mod.lessons?.length && (
                <li className="px-5 py-4 text-xs text-ink-400">Belum ada lesson pada modul ini.</li>
              )}
            </ul>
          </Card>
        ))}
      </div>

      {nextLesson && (
        <div className="mt-8 flex justify-center">
          <LinkButton to={`/lessons/${nextLesson.slug}`} size="lg">
            Lanjut ke: {nextLesson.title} <ArrowRightIcon className="h-4 w-4" />
          </LinkButton>
        </div>
      )}
    </div>
  )
}
