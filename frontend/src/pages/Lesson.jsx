import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../store'
import Markdown from '../components/Markdown'
import { Badge, Button, Card, EmptyState, LinkButton, PageLoader, ProgressBar, Spinner, cx } from '../components/ui'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  AwardIcon,
  BookIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  LockIcon,
  SparklesIcon,
  TargetIcon,
  TrophyIcon,
} from '../components/icons'
import useSimulator from '../features/git-simulator/useSimulator'
import { validatePractice } from '../features/git-simulator/engine'
import Terminal from '../features/git-simulator/components/Terminal'
import CommitGraph from '../features/git-simulator/components/CommitGraph'
import TaskPanel from '../features/git-simulator/components/TaskPanel'
import ExplainCommand from '../features/git-simulator/components/ExplainCommand'
import QuizRunner from '../features/quiz/QuizRunner'
import Comments from '../features/community/Comments'
import { statusLabel } from '../utils/format'

export default function Lesson() {
  const { slug } = useParams()
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('teori')
  const [quizScore, setQuizScore] = useState({ score: 0, total: 0 })
  const [completion, setCompletion] = useState(null)
  const savedPracticeRef = useRef(false)
  const quizRef = useRef(null)
  const topRef = useRef(null)

  const lessonQuery = useQuery({ queryKey: ['lesson', slug], queryFn: () => api.lesson(slug) })
  const quizzesQuery = useQuery({
    queryKey: ['quizzes', slug],
    queryFn: () => api.quizzes(slug),
    enabled: Boolean(lessonQuery.data),
  })

  const lesson = lessonQuery.data
  const practiceConfig = useMemo(() => {
    const config = lesson?.practice_config
    if (typeof config === 'string') {
      try {
        return JSON.parse(config)
      } catch {
        return null
      }
    }
    return config || null
  }, [lesson])

  const simulator = useSimulator(practiceConfig?.scenario || 'empty')
  const validation = useMemo(
    () => (practiceConfig?.checks?.length ? validatePractice(simulator.repo, practiceConfig) : null),
    [simulator.repo, practiceConfig],
  )

  useEffect(() => {
    savedPracticeRef.current = false
    setQuizScore({ score: 0, total: 0 })
    setCompletion(null)
    setTab('teori')
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [slug])

  const practiceMutation = useMutation({
    mutationFn: () => api.completePractice(slug),
    onSuccess: () => {
      queryClient.setQueryData(['lesson', slug], (old) =>
        old ? { ...old, practice_done: true, status: old.status === 'not_started' ? 'in_progress' : old.status } : old,
      )
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['path'] })
    },
    onError: () => {
      savedPracticeRef.current = false
    },
  })

  useEffect(() => {
    if (!lesson || !practiceConfig || !validation?.passed) return
    if (simulator.ranCommands === 0 || !accessToken || lesson.practice_done) return
    if (savedPracticeRef.current) return
    savedPracticeRef.current = true
    practiceMutation.mutate()
  }, [lesson, practiceConfig, validation, simulator.ranCommands, accessToken, practiceMutation])

  const handleAllAnswered = useCallback((score, total) => {
    setQuizScore({ score, total })
  }, [])

  const answerFn = useCallback(
    async (quizId, optionId) => {
      if (!accessToken) throw new Error('Masuk dulu untuk menyimpan jawaban.')
      return api.answerQuiz(quizId, optionId)
    },
    [accessToken],
  )

  const completeMutation = useMutation({
    mutationFn: () =>
      api.completeLesson(slug, { quiz_score: quizScore.score, quiz_total: quizScore.total }),
    onSuccess: (data) => {
      setCompletion(data)
      queryClient.setQueryData(['lesson', slug], (old) => (old ? { ...old, status: 'completed' } : old))
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['paths'] })
      queryClient.invalidateQueries({ queryKey: ['path'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setTimeout(() => quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    },
  })

  function promptLogin() {
    navigate('/login', { state: { from: location.pathname } })
  }

  if (lessonQuery.isLoading) return <PageLoader label="Memuat lesson…" />
  if (lessonQuery.error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Lesson tidak ditemukan"
          description={lessonQuery.error.message}
          action={<LinkButton to="/paths">Kembali ke jalur belajar</LinkButton>}
        />
      </div>
    )
  }

  const quizzes = quizzesQuery.data || []
  const practiceDone = Boolean(lesson.practice_done || completion)
  const quizTotal = quizzes.length || lesson.quiz_total || 0
  const allAnswered = quizTotal > 0 && quizScore.total === quizTotal
  const lessonCompleted = lesson.status === 'completed'
  const canComplete =
    !lessonCompleted &&
    !lesson.locked &&
    Boolean(accessToken) &&
    allAnswered &&
    (!practiceConfig || practiceDone) &&
    !completeMutation.isPending
  const completeBlockedReason = !accessToken
    ? 'Masuk untuk menyimpan progres lesson.'
    : lesson.locked
      ? 'Selesaikan lesson sebelumnya dulu untuk membuka lesson ini.'
      : practiceConfig && !practiceDone
        ? 'Selesaikan tugas praktik dulu di panel kanan.'
        : !allAnswered
          ? 'Jawab semua kuis terlebih dahulu.'
          : ''

  const showTheory = tab === 'teori'
  const showPractice = tab === 'praktik'

  return (
    <div ref={topRef} className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-400" aria-label="Breadcrumb">
        <Link to="/paths" className="hover:text-ink-700 dark:hover:text-ink-200">Jalur belajar</Link>
        <span>/</span>
        <Link to={`/paths/${lesson.module?.path?.slug}`} className="hover:text-ink-700 dark:hover:text-ink-200">
          {lesson.module?.path?.title}
        </Link>
        <span>/</span>
        <span className="text-ink-600 dark:text-ink-300">{lesson.module?.title}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={lessonCompleted ? 'emerald' : lesson.locked ? 'ink' : 'brand'}>
              {lessonCompleted ? 'Selesai' : lesson.locked ? 'Terkunci' : statusLabel(lesson.status)}
            </Badge>
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
              <ClockIcon className="h-3.5 w-3.5" /> {lesson.estimated_minutes} menit
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
              <BookIcon className="h-3.5 w-3.5" /> {lesson.module?.title}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white sm:text-3xl">
            {lesson.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <LinkButton to={`/paths/${lesson.module?.path?.slug}`} variant="secondary" size="sm">
            <ArrowLeftIcon className="h-4 w-4" /> Jalur
          </LinkButton>
        </div>
      </div>

      {lesson.locked && !lessonCompleted && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Lesson ini terkunci karena lesson sebelumnya belum selesai. Kamu tetap bisa membaca dan berlatih, tetapi
            urutan yang disarankan adalah mengikuti jalur dari awal.
          </p>
        </div>
      )}

      {completion && (
        <Card className="mt-4 overflow-hidden border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/20">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                <CheckCircleIcon className="h-5 w-5" /> Lesson selesai! +{completion.xp_earned || 0} XP
              </p>
              {completion.badges?.length > 0 && (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Badge baru: {completion.badges.map((b) => b.name).join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {completion.next_lesson_slug ? (
                <LinkButton to={`/lessons/${completion.next_lesson_slug}`} size="sm">
                  Lesson berikutnya <ArrowRightIcon className="h-4 w-4" />
                </LinkButton>
              ) : (
                <LinkButton to="/dashboard" size="sm">
                  Ke dashboard
                </LinkButton>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="mt-5 flex gap-2 lg:hidden" role="tablist" aria-label="Tampilan lesson">
        {[
          { id: 'teori', label: 'Teori' },
          { id: 'praktik', label: 'Praktik' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
              tab === t.id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
            )}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => quizRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="flex-1 rounded-lg bg-ink-100 px-3 py-2 text-sm font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300"
        >
          Kuis
        </button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)]">
        <div className={cx('min-w-0', !showTheory && 'hidden lg:block')}>
          <Card className="p-5 sm:p-7">
            <Markdown>{lesson.content_md}</Markdown>
          </Card>

          <div className="mt-4 flex items-center justify-between gap-3">
            {lesson.prev_slug ? (
              <Link
                to={`/lessons/${lesson.prev_slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" /> Lesson sebelumnya
              </Link>
            ) : (
              <span />
            )}
            {lesson.next_slug && (
              <Link
                to={`/lessons/${lesson.next_slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
              >
                Lesson berikutnya <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        <div className={cx('space-y-4', !showPractice && 'hidden lg:block')}>
          <div className="lg:sticky lg:top-20 lg:space-y-4">
            <TaskPanel
              config={practiceConfig}
              validation={validation}
              practiceDone={practiceDone}
              onReset={simulator.reset}
              onLogin={promptLogin}
              canPersist={Boolean(accessToken)}
              saving={practiceMutation.isPending}
            />
            <Terminal
              lines={simulator.lines}
              onCommand={simulator.run}
              onReset={simulator.reset}
              onUndo={simulator.undo}
              canUndo={simulator.canUndo}
              suggestions={practiceConfig?.commands || ['git status', 'git log --oneline', 'help']}
            />
            <CommitGraph repo={simulator.repo} />
            <ExplainCommand />
          </div>
        </div>
      </div>

      <section ref={quizRef} id="kuis" className="mt-10 scroll-mt-20">
        {quizzesQuery.isLoading ? (
          <PageLoader label="Memuat kuis…" />
        ) : (
          <QuizRunner
            quizzes={quizzes}
            answerFn={answerFn}
            onAllAnswered={handleAllAnswered}
            disabled={!accessToken}
            completed={lessonCompleted}
            initialScore={lesson.quiz_score || 0}
          />
        )}

        <Card className="mt-5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
                <TrophyIcon className="h-4 w-4 text-amber-500" /> Selesaikan lesson
              </h3>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                {lessonCompleted
                  ? 'Lesson ini sudah selesai. Skor kuis bisa kamu ulangi kapan saja.'
                  : completeBlockedReason || 'Semua siap — simpan progresmu dan lanjut ke lesson berikutnya.'}
              </p>
              {quizTotal > 0 && (
                <div className="mt-2 flex max-w-xs items-center gap-2">
                  <ProgressBar value={quizScore.total ? (quizScore.score / quizScore.total) * 100 : (lesson.quiz_score / Math.max(1, quizTotal)) * 100} />
                  <span className="shrink-0 text-[10px] text-ink-400">
                    {quizScore.total ? quizScore.score : lesson.quiz_score || 0}/{quizTotal}
                  </span>
                </div>
              )}
            </div>
            {lessonCompleted ? (
              <Badge tone="emerald" className="shrink-0 px-3 py-1.5">
                <CheckIcon className="h-3.5 w-3.5" /> Selesai
              </Badge>
            ) : (
              <Button
                size="lg"
                onClick={() => completeMutation.mutate()}
                disabled={!canComplete}
                className="shrink-0"
              >
                {completeMutation.isPending ? <Spinner className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />}
                {completeMutation.isPending ? 'Menyimpan…' : 'Tandai lesson selesai'}
              </Button>
            )}
          </div>
          {completeMutation.error && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">{completeMutation.error.message}</p>
          )}
          {!accessToken && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500 dark:bg-ink-800/50 dark:text-ink-400">
              <LockIcon className="h-4 w-4" />
              Ingin progres tersimpan? <button type="button" onClick={promptLogin} className="font-semibold text-brand-600 underline dark:text-brand-400">Masuk atau daftar gratis</button>
            </div>
          )}
        </Card>
      </section>

      {completion?.badges?.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {completion.badges.map((badge) => (
            <Badge key={badge.code} tone="amber" className="px-3 py-1.5">
              <AwardIcon className="h-3.5 w-3.5" /> {badge.name}
            </Badge>
          ))}
        </div>
      )}

      <Comments slug={slug} />
    </div>
  )
}
