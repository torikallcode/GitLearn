import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, LinkButton, PageLoader, ProgressBar, Spinner, cx } from '../components/ui'
import { CalendarIcon, CheckCircleIcon, CheckIcon, ClockIcon, SparklesIcon, XCircleIcon } from '../components/icons'
import { formatDate } from '../utils/format'

export default function Review() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ['reviews'], queryFn: api.reviews })
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState({})
  const [pending, setPending] = useState(null)
  const [submitError, setSubmitError] = useState('')

  const answerMutation = useMutation({
    mutationFn: ({ reviewId, optionId }) => api.answerReview(reviewId, optionId),
    onSuccess: (result, variables) => {
      setAnswers((prev) => ({ ...prev, [variables.reviewId]: result }))
      queryClient.invalidateQueries({ queryKey: ['progress'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err) => setSubmitError(err.message || 'Gagal menyimpan jawaban.'),
  })

  function submit(item) {
    const optionId = selected[item.id]
    if (!optionId) return
    setSubmitError('')
    setPending(item.id)
    answerMutation.mutate(
      { reviewId: item.id, optionId },
      { onSettled: () => setPending(null) },
    )
  }

  if (isLoading) return <PageLoader label="Memuat review…" />
  if (error) return <p className="px-4 py-16 text-center text-sm text-red-500">{error.message}</p>

  const reviews = data || []
  const done = Object.keys(answers).length
  const correct = Object.values(answers).filter((a) => a.is_correct).length

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Spaced repetition</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">Review hari ini</h1>
            <p className="mt-2 max-w-xl text-sm text-ink-500 dark:text-ink-400">
              Kuis yang pernah kamu jawab salah akan muncul kembali sesuai jadwal. Mengulang di waktu yang tepat membuat
              konsepnya bertahan lebih lama.
            </p>
          </div>
          <Badge tone={reviews.length ? 'amber' : 'emerald'} className="px-3 py-1.5">
            <CalendarIcon className="h-3.5 w-3.5" /> {reviews.length ? `${reviews.length} kuis jatuh tempo` : 'Tidak ada antrean'}
          </Badge>
        </div>
        {reviews.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-ink-400">
              <span>{done}/{reviews.length} dijawab</span>
              {done > 0 && <span>{correct} benar</span>}
            </div>
            <ProgressBar value={(done / reviews.length) * 100} className="mt-2" />
          </div>
        )}
      </div>

      {submitError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{submitError}</p>}

      {reviews.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Tidak ada review yang jatuh tempo"
            description="Kerjakan kuis di lesson berikutnya. Jawaban yang salah akan otomatis masuk antrean review besok."
            icon={<CheckCircleIcon className="h-8 w-8 text-emerald-500" />}
            action={<LinkButton to="/dashboard">Kembali ke dashboard</LinkButton>}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((item, index) => {
            const answer = answers[item.id]
            return (
              <Card key={item.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-xs font-bold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-400">
                      <Link to={`/lessons/${item.lesson_slug}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                        {item.lesson_title}
                      </Link>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1"><ClockIcon className="h-3 w-3" /> {item.interval_days} hari</span>
                      <span>·</span>
                      <span>jatuh tempo {formatDate(item.next_review_at)}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-900 dark:text-white">{item.question}</p>

                    <div className="mt-3 space-y-2" role="radiogroup" aria-label={`Jawaban review ${index + 1}`}>
                      {item.options.map((option) => {
                        const isSelected = answer ? answer.selected_option_id === option.id : selected[item.id] === option.id
                        const isCorrect = answer && answer.correct_option_id === option.id
                        const isWrong = answer && answer.selected_option_id === option.id && !answer.is_correct
                        return (
                          <label
                            key={option.id}
                            className={cx(
                              'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                              isCorrect && 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
                              isWrong && 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
                              !isCorrect && !isWrong && isSelected && 'border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20',
                              !isCorrect && !isWrong && !isSelected && 'border-ink-200 hover:border-ink-300 dark:border-ink-700',
                              answer && 'cursor-default',
                            )}
                          >
                            <input
                              type="radio"
                              name={`review-${item.id}`}
                              checked={isSelected}
                              disabled={Boolean(answer) || pending === item.id}
                              onChange={() => setSelected((prev) => ({ ...prev, [item.id]: option.id }))}
                              className="mt-1 h-3.5 w-3.5 accent-brand-600"
                            />
                            <span className="flex-1 text-ink-700 dark:text-ink-200">{option.option_text}</span>
                            {isCorrect && <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />}
                            {isWrong && <XCircleIcon className="mt-0.5 h-4 w-4 text-red-500" />}
                          </label>
                        )
                      })}
                    </div>

                    {!answer && (
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => submit(item)}
                        disabled={!selected[item.id] || pending === item.id}
                      >
                        {pending === item.id ? <Spinner className="h-3.5 w-3.5" /> : null}
                        {pending === item.id ? 'Memeriksa…' : 'Kirim jawaban'}
                      </Button>
                    )}

                    {answer && (
                      <div className={cx(
                        'mt-3 rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
                        answer.is_correct
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200'
                          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200',
                      )}>
                        <p className="font-bold">{answer.is_correct ? 'Benar! Jadwal review diperpanjang.' : 'Belum tepat. Kuis ini akan muncul lagi besok.'}</p>
                        <p className="mt-1">{answer.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}

          {done === reviews.length && reviews.length > 0 && (
            <Card className="flex flex-col items-center justify-between gap-3 border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-900/20 sm:flex-row">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                <SparklesIcon className="h-4 w-4" /> Semua review hari ini selesai — {correct}/{reviews.length} benar.
              </p>
              <LinkButton to="/dashboard" size="sm">Kembali ke dashboard</LinkButton>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
