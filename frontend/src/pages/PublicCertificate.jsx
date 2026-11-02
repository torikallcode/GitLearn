import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import { Badge, LinkButton, PageLoader } from '../components/ui'
import { AwardIcon, CheckCircleIcon } from '../components/icons'
import CertificateDocument from '../features/certificate/CertificateDocument'

export default function PublicCertificate() {
  const { code } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-certificate', code],
    queryFn: () => api.publicCertificate(code),
    retry: false,
  })

  if (isLoading) return <PageLoader label="Memverifikasi sertifikat…" />

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/40">
          <AwardIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-ink-950 dark:text-white">Sertifikat tidak ditemukan</h1>
        <p className="mt-2 text-sm text-ink-500">
          Kode sertifikat tidak valid, belum terbit, atau pemiliknya belum menyelesaikan kurikulum inti.
        </p>
        <LinkButton to="/" className="mt-6">
          Kembali ke GitLearn
        </LinkButton>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">
            <CheckCircleIcon className="h-6 w-6 text-emerald-500" /> Sertifikat terverifikasi
          </h1>
          <p className="mt-1 text-sm text-ink-500">Halaman publik ini dapat dibagikan sebagai bukti pembelajaran.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to="/paths" variant="secondary">
            Jelajahi jalur
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

      <div className="no-print mt-6 text-center">
        <Badge tone="emerald">Terverifikasi di GitLearn · {data.certificate_code}</Badge>
      </div>
    </div>
  )
}
