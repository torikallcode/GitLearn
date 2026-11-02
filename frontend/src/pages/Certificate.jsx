import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { Badge, Card, LinkButton, PageLoader, ProgressBar } from '../components/ui'
import { AwardIcon, CheckCircleIcon, ExternalIcon, LockIcon, SparklesIcon } from '../components/icons'
import CertificateDocument from '../features/certificate/CertificateDocument'

export default function Certificate() {
  const { data, isLoading, error } = useQuery({ queryKey: ['certificate'], queryFn: api.certificate })

  if (isLoading) return <PageLoader label="Memeriksa kelayakan sertifikat…" />
  if (error) return <p className="px-4 py-16 text-center text-sm text-red-500">{error.message}</p>

  if (!data?.available) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Card className="p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800">
            <LockIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-ink-950 dark:text-white">Sertifikat belum terbuka</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500 dark:text-ink-400">
            Selesaikan seluruh lesson pada kurikulum inti (Fundamental, Kolaborasi, Profesional) untuk membuka
            sertifikat penyelesaian. Jalur karier bersifat opsional.
          </p>
          <div className="mx-auto mt-6 max-w-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-500">Progres</span>
              <span className="font-semibold text-ink-800 dark:text-ink-100">{Math.round(data?.completion_percent || 0)}%</span>
            </div>
            <ProgressBar value={data?.completion_percent || 0} className="mt-2" />
            <p className="mt-2 text-[11px] text-ink-400">
              {data?.completed_lessons || 0} dari {data?.lessons_total || 0} lesson selesai
            </p>
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <LinkButton to="/dashboard">Lanjut belajar</LinkButton>
            <LinkButton to="/paths" variant="secondary">Lihat jalur</LinkButton>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">Sertifikatmu</h1>
          <p className="mt-1 text-sm text-ink-500">Bagikan sebagai bukti pembelajaran, atau cetak sebagai PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to={`/certificate/${data.certificate_code}`} variant="secondary">
            <ExternalIcon className="h-4 w-4" /> Halaman publik
          </LinkButton>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <AwardIcon className="h-4 w-4" /> Cetak / Simpan PDF
          </button>
        </div>
      </div>

      <CertificateDocument data={data} />

      <div className="no-print mt-5 grid gap-3 sm:grid-cols-2">
        <Card className="flex items-start gap-3 p-4">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Kurikulum inti selesai</p>
            <p className="mt-0.5 text-xs text-ink-500">Fundamental, GitHub Collaboration, dan Profesional.</p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
          <div>
            <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Terus berlatih</p>
            <p className="mt-0.5 text-xs text-ink-500">Sertifikat bukan garis akhir — lanjutkan jalur karier dan review.</p>
          </div>
        </Card>
      </div>

      <div className="no-print mt-6 flex justify-center gap-2">
        <LinkButton to="/paths" variant="secondary">Jelajahi jalur karier</LinkButton>
        <LinkButton to="/dashboard">Dashboard</LinkButton>
      </div>
      <div className="no-print mt-6 text-center">
        <Badge tone="emerald">Terverifikasi di GitLearn · {data.certificate_code}</Badge>
      </div>
    </div>
  )
}
