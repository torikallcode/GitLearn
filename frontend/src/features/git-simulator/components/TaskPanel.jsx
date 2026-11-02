import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Card, cx } from '../../../components/ui'
import {
  BulbIcon,
  CheckCircleIcon,
  CheckIcon,
  LockIcon,
  PlayIcon,
  RotateIcon,
  TargetIcon,
  XCircleIcon,
} from '../../../components/icons'

export default function TaskPanel({
  config,
  validation,
  practiceDone,
  onReset,
  onLogin,
  canPersist,
  saving,
}) {
  const [revealed, setRevealed] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const hints = config?.hints || []
  const passed = validation?.passed
  const done = practiceDone || (passed && canPersist)

  useEffect(() => {
    setRevealed(0)
    setDismissed(false)
  }, [config])

  if (!config) {
    return (
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
          <TargetIcon className="h-4 w-4 text-brand-500" /> Praktik
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          Lesson ini fokus teori. Kamu tetap bisa mencoba command di terminal dan melihat commit graph berubah.
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
            <TargetIcon className="h-4 w-4 text-brand-500" /> Tugas praktik
          </h2>
          {done ? <Badge tone="emerald"><CheckIcon className="h-3 w-3" /> Selesai</Badge> : <Badge tone="amber">Latihan</Badge>}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-600 dark:text-ink-300">{config.goal}</p>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-400">Kriteria berhasil</p>
          <ul className="space-y-1.5" aria-live="polite">
            {(validation?.checks || []).map((check, i) => (
              <li key={i} className="flex items-start gap-2 text-[11.5px]">
                {check.passed ? (
                  <CheckCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300 dark:text-ink-600" />
                )}
                <span className={check.passed ? 'text-ink-500 dark:text-ink-400' : 'text-ink-700 dark:text-ink-200'}>
                  {check.label}
                </span>
              </li>
            ))}
            {!validation?.checks?.length && <li className="text-[11.5px] text-ink-400">Jalankan command untuk mulai.</li>}
          </ul>
        </div>

        {passed && !done && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300">
            {canPersist ? (
              <span className="inline-flex items-center gap-1.5"><CheckCircleIcon className="h-3.5 w-3.5" /> Semua kriteria terpenuhi — menyimpan progres…</span>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-1">
                Semua kriteria terpenuhi.
                <button type="button" onClick={onLogin} className="font-bold underline">
                  Masuk untuk menyimpan progres
                </button>
              </span>
            )}
          </div>
        )}

        {done && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300">
            Praktik tersimpan. Lanjut ke kuis di bawah.
          </div>
        )}

        {hints.length > 0 && (
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-400">
                <BulbIcon className="h-3.5 w-3.5 text-amber-500" /> Hint
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRevealed((n) => Math.min(hints.length, n + 1))}
                disabled={revealed >= hints.length}
                className="h-6 px-2 text-[10px]"
              >
                {revealed === 0 ? 'Buka hint' : revealed >= hints.length ? 'Semua hint terbuka' : 'Hint berikutnya'}
              </Button>
            </div>
            {revealed === 0 ? (
              <p className="mt-1 text-[11px] text-ink-400">Coba sendiri dulu — hint dibuka bertahap.</p>
            ) : (
              <ol className="mt-2 space-y-1.5">
                {hints.slice(0, revealed).map((hint, i) => (
                  <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-ink-600 dark:text-ink-300">
                    <span className="font-mono text-[10px] font-bold text-amber-500">{i + 1}.</span> {hint}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[10.5px] font-medium text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
          >
            <RotateIcon className="h-3.5 w-3.5" /> Reset sandbox
          </button>
          {saving ? (
            <span className="text-[10.5px] text-ink-400">Menyimpan…</span>
          ) : (
            <span className={cx('inline-flex items-center gap-1 text-[10.5px]', passed ? 'text-emerald-500' : 'text-ink-400')}>
              {passed ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3 w-3" />}
              {passed ? 'Kriteria terpenuhi' : 'Jalankan command di terminal'}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
