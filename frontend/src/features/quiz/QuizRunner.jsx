import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, ProgressBar, Spinner, cx } from '../../components/ui'
import { CheckCircleIcon, CheckIcon, SparklesIcon, XCircleIcon } from '../../components/icons'

export default function QuizRunner({
  quizzes = [],
  answerFn,
  onAllAnswered,
  disabled = false,
  completed = false,
  initialScore = 0,
}) {
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState({})
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const notified = useRef(false)

  const total = quizzes.length
  const answeredCount = Object.keys(answers).length
  const correctCount = useMemo(
    () => Object.values(answers).filter((a) => a?.is_correct).length,
    [answers],
  )
  const allAnswered = total > 0 && answeredCount === total

  useEffect(() => {
    if (allAnswered && !notified.current) {
      notified.current = true
      onAllAnswered?.(correctCount, total)
    }
  }, [allAnswered, correctCount, total, onAllAnswered])

  useEffect(() => {
    notified.current = false
    setAnswers({})
    setSelected({})
    setError('')
  }, [quizzes])

  async function submit(quiz) {
    const optionId = selected[quiz.id]
    if (!optionId || disabled) return
    setPending(quiz.id)
    setError('')
    try {
      const result = await answerFn(quiz.id, optionId)
      setAnswers((prev) => ({ ...prev, [quiz.id]: { ...result, selected_option_id: optionId } }))
    } catch (err) {
      setError(err.message || 'Gagal mengirim jawaban.')
    } finally {
      setPending(null)
    }
  }

  if (!total) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-ink-500">Belum ada kuis untuk lesson ini.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Kuis</h2>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            Jawab semua soal untuk mengunci skor. Setiap jawaban langsung diberi penjelasan.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {completed && initialScore > 0 && (
            <Badge tone="emerald">
              Skor tersimpan {initialScore}/{total}
            </Badge>
          )}
          <Badge tone={allAnswered ? 'emerald' : 'ink'}>
            {answeredCount}/{total} dijawab
          </Badge>
          {answeredCount > 0 && <Badge tone="brand">{correctCount} benar</Badge>}
        </div>
      </div>
      <ProgressBar value={total ? (answeredCount / total) * 100 : 0} />

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          {error}
          {disabled && ' Masuk untuk menjawab dan menyimpan skor.'}
        </div>
      )}

      {quizzes.map((quiz, index) => {
        const answer = answers[quiz.id]
        const isPending = pending === quiz.id
        return (
          <Card key={quiz.id} className="p-5">
            <div className="flex items-start gap-3">
              <span className={cx(
                'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold',
                answer?.is_correct
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : answer
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
              )}>
                {answer ? (answer.is_correct ? <CheckIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />) : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-relaxed text-ink-900 dark:text-white">{quiz.question}</p>

                <div className="mt-3 space-y-2" role="radiogroup" aria-label={`Pilihan jawaban soal ${index + 1}`}>
                  {quiz.options.map((option) => {
                    const isSelected = answer ? answer.selected_option_id === option.id : selected[quiz.id] === option.id
                    const isCorrect = answer && answer.correct_option_id === option.id
                    const isWrongSelected = answer && answer.selected_option_id === option.id && !answer.is_correct
                    return (
                      <label
                        key={option.id}
                        className={cx(
                          'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                          isCorrect && 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
                          isWrongSelected && 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
                          !isCorrect && !isWrongSelected && isSelected && 'border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20',
                          !isCorrect && !isWrongSelected && !isSelected && 'border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600',
                          answer && 'cursor-default',
                        )}
                      >
                        <input
                          type="radio"
                          name={`quiz-${quiz.id}`}
                          value={option.id}
                          checked={isSelected}
                          disabled={Boolean(answer) || disabled || isPending}
                          onChange={() => setSelected((prev) => ({ ...prev, [quiz.id]: option.id }))}
                          className="mt-1 h-3.5 w-3.5 accent-brand-600"
                        />
                        <span className="flex-1 text-ink-700 dark:text-ink-200">{option.option_text}</span>
                        {isCorrect && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">BENAR</span>}
                        {isWrongSelected && <span className="text-[10px] font-bold text-red-600 dark:text-red-400">PILIHANMU</span>}
                      </label>
                    )
                  })}
                </div>

                {!answer && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => submit(quiz)}
                    disabled={!selected[quiz.id] || disabled || isPending}
                  >
                    {isPending ? <Spinner className="h-3.5 w-3.5" /> : null}
                    {isPending ? 'Memeriksa…' : 'Periksa jawaban'}
                  </Button>
                )}

                {answer && (
                  <div
                    className={cx(
                      'mt-3 rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
                      answer.is_correct
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200'
                        : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200',
                    )}
                  >
                    <p className="font-bold">{answer.is_correct ? 'Tepat!' : 'Belum tepat — tapi ini bagian dari belajar.'}</p>
                    <p className="mt-1">{answer.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })}

      {allAnswered && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-900/20 sm:flex-row">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800 dark:text-brand-200">
            <SparklesIcon className="h-4 w-4" /> Skor kuis: {correctCount}/{total}
            {correctCount === total && ' — sempurna!'}
          </p>
          <p className="text-[11px] text-brand-700/70 dark:text-brand-300/70">Skor tersimpan otomatis. Selesaikan lesson di panel atas.</p>
        </div>
      )}
    </div>
  )
}
