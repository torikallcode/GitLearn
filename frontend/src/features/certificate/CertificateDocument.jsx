import { AwardIcon } from '../../components/icons'
import { formatDate } from '../../utils/format'

export default function CertificateDocument({ data }) {
  return (
    <div className="print-area relative overflow-hidden rounded-3xl border-[6px] border-double border-brand-200 bg-white p-8 shadow-xl dark:border-brand-800 dark:bg-ink-900 sm:p-12">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <AwardIcon className="h-7 w-7" />
        </span>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">
          GitLearn — Sertifikat Penyelesaian
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white sm:text-4xl">
          {data.name}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-500 dark:text-ink-300">
          telah menyelesaikan seluruh kurikulum inti Git &amp; GitHub GitLearn - dari fundamental, kolaborasi tim,
          hingga workflow profesional - dengan tingkat penyelesaian{' '}
          <strong className="text-ink-800 dark:text-white">{Math.round(data.completion_percent)}%</strong>.
        </p>

        <div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3 border-y border-ink-100 py-4 dark:border-ink-800">
          <div>
            <p className="text-lg font-extrabold text-ink-900 dark:text-white">{data.completed_lessons}</p>
            <p className="text-[10px] text-ink-400">Lesson selesai</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-ink-900 dark:text-white">{Math.round(data.completion_percent)}%</p>
            <p className="text-[10px] text-ink-400">Penyelesaian</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-ink-900 dark:text-white">{formatDate(data.issued_at)}</p>
            <p className="text-[10px] text-ink-400">Tanggal terbit</p>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-md items-center justify-between">
          <div className="text-left">
            <p className="text-[10px] text-ink-400">Kode sertifikat</p>
            <p className="font-mono text-xs font-semibold text-ink-700 dark:text-ink-200">{data.certificate_code}</p>
          </div>
          <div className="text-right">
            <p className="font-serif text-lg italic text-ink-800 dark:text-ink-100">GitLearn</p>
            <p className="text-[10px] text-ink-400">Learning Platform</p>
          </div>
        </div>
      </div>
    </div>
  )
}
