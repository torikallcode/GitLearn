import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../store'
import { Badge, Button, Card, LinkButton, PageLoader, ProgressBar, SectionTitle, Stat } from '../components/ui'
import {
  ArrowRightIcon,
  AwardIcon,
  BookIcon,
  BranchIcon,
  CalendarIcon,
  ClockIcon,
  FlameIcon,
  LockIcon,
  SparklesIcon,
  TargetIcon,
  TrophyIcon,
  ZapIcon,
} from '../components/icons'
import { achievementEmoji, formatDate } from '../utils/format'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({ queryKey: ['progress'], queryFn: api.progress })
  const { data: reviews } = useQuery({ queryKey: ['reviews'], queryFn: api.reviews })
  const { data: paths } = useQuery({ queryKey: ['paths'], queryFn: api.paths })

  if (isLoading) return <PageLoader label="Memuat dashboard…" />
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-red-500">{error.message}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Coba lagi
        </Button>
      </div>
    )
  }

  const stats = data?.stats || {}
  const badges = data?.badges || []
  const modules = data?.modules || []
  const next = data?.next_lesson
  const careerPath = (paths || []).find((p) => p.track === user?.career_goal)
  const grouped = modules.reduce((acc, mod) => {
    acc[mod.path_title] = acc[mod.path_title] || []
    acc[mod.path_title].push(mod)
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-500 dark:text-ink-400">{greeting()},</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white sm:text-3xl">
            {user?.name?.split(' ')[0] || 'Learner'} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {next ? 'Lanjutkan dari tempat terakhir, atau mulai lesson berikutnya.' : 'Semua lesson selesai — luar biasa!'}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton to="/review" variant="secondary" size="sm">
            <CalendarIcon className="h-4 w-4" /> Review {reviews?.length ? `(${reviews.length})` : ''}
          </LinkButton>
          <LinkButton to="/paths" size="sm">
            <BookIcon className="h-4 w-4" /> Jalur belajar
          </LinkButton>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Progres keseluruhan"
          value={`${Math.round(data?.completion_percent || 0)}%`}
          hint={`${data?.lessons_completed || 0} dari ${data?.lessons_total || 0} lesson`}
          icon={<TargetIcon className="h-5 w-5" />}
        />
        <Stat label="XP terkumpul" value={stats.xp || 0} hint="Dari praktik, lesson, dan kuis" icon={<ZapIcon className="h-5 w-5" />} tone="amber" />
        <Stat
          label="Streak saat ini"
          value={`${stats.current_streak || 0} hari`}
          hint={`Terpanjang: ${stats.longest_streak || 0} hari`}
          icon={<FlameIcon className="h-5 w-5" />}
          tone="emerald"
        />
        <Stat label="Badge" value={badges.length} hint="Kumpulkan dengan konsisten" icon={<TrophyIcon className="h-5 w-5" />} tone="violet" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.45fr_.55fr]">
        <div className="space-y-8">
          <section>
            <SectionTitle eyebrow="Lanjutkan" title="Lesson berikutnya" />
            {next ? (
              <Card className="relative overflow-hidden p-0">
                <div className="absolute inset-y-0 left-0 w-1 bg-brand-600" />
                <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
                      <Badge tone="brand">{next.path_title}</Badge>
                      <span>{next.module_title}</span>
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-ink-900 dark:text-white">{next.title}</h3>
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                      Praktik di terminal simulator, lihat commit graph, lalu uji dengan kuis.
                    </p>
                  </div>
                  <LinkButton to={`/lessons/${next.slug}`} size="lg" className="shrink-0">
                    Lanjut belajar <ArrowRightIcon className="h-4 w-4" />
                  </LinkButton>
                </div>
              </Card>
            ) : (
              <Card className="flex flex-col items-center p-8 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <AwardIcon className="h-6 w-6" />
                </span>
                <h3 className="mt-3 font-bold text-ink-900 dark:text-white">Semua jalur inti selesai!</h3>
                <p className="mt-1 text-sm text-ink-500">Lihat sertifikatmu atau eksplor jalur karier.</p>
                <LinkButton to="/certificate" className="mt-4">
                  Lihat sertifikat
                </LinkButton>
              </Card>
            )}
          </section>

          <section>
            <SectionTitle
              title="Progres per jalur"
              action={
                <Link to="/paths" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
                  Semua jalur →
                </Link>
              }
            />
            <div className="space-y-5">
              {Object.entries(grouped).map(([pathTitle, mods]) => {
                const total = mods.reduce((sum, m) => sum + m.lesson_count, 0)
                const done = mods.reduce((sum, m) => sum + m.completed_lessons, 0)
                return (
                  <Card key={pathTitle} className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold text-ink-900 dark:text-white">{pathTitle}</h3>
                      <span className="text-xs text-ink-400">
                        {done}/{total} lesson
                      </span>
                    </div>
                    <ProgressBar value={total ? (done / total) * 100 : 0} className="mt-3" />
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {mods.map((mod) => (
                        <div key={mod.module_title} className="rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800/50">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate font-medium text-ink-700 dark:text-ink-200">{mod.module_title}</span>
                            <span className="shrink-0 text-ink-400">
                              {mod.completed_lessons}/{mod.lesson_count}
                            </span>
                          </div>
                          <ProgressBar value={mod.progress_percent} className="mt-1.5 h-1" />
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })}
              {!modules.length && <p className="text-sm text-ink-400">Belum ada progres. Mulai lesson pertama!</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink-900 dark:text-white">Review hari ini</h3>
              <Badge tone={reviews?.length ? 'amber' : 'ink'}>{reviews?.length || 0} kuis</Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
              Kuis yang pernah salah diulang sesuai jadwal agar konsepnya tidak lupa.
            </p>
            <LinkButton to="/review" variant="secondary" size="sm" className="mt-4 w-full">
              <CalendarIcon className="h-4 w-4" /> Mulai review
            </LinkButton>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-ink-900 dark:text-white">Badge terbaru</h3>
            {badges.length ? (
              <div className="mt-3 space-y-2">
                {badges.slice(-4).reverse().map((badge) => (
                  <div key={badge.code} className="flex items-center gap-3 rounded-lg bg-ink-50 p-2.5 dark:bg-ink-800/50">
                    <span className="text-xl">{achievementEmoji(badge.code)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink-800 dark:text-ink-100">{badge.name}</p>
                      <p className="truncate text-[10px] text-ink-400">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-400">Selesaikan lesson pertama untuk membuka badge.</p>
            )}
            <Link to="/profile" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Lihat semua <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </Card>

          {careerPath ? (
            <Card className="p-5">
              <Badge tone="brand">Jalur karier</Badge>
              <h3 className="mt-2 font-bold text-ink-900 dark:text-white">{careerPath.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">{careerPath.description}</p>
              <ProgressBar value={careerPath.progress_percent || 0} className="mt-3" />
              <LinkButton to={`/paths/${careerPath.slug}`} size="sm" variant="secondary" className="mt-3 w-full">
                Buka jalur <ArrowRightIcon className="h-3.5 w-3.5" />
              </LinkButton>
            </Card>
          ) : (
            <Card className="p-5">
              <Badge tone="brand">Rekomendasi</Badge>
              <h3 className="mt-2 font-bold text-ink-900 dark:text-white">Pilih spesialisasi</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                Atur target karier untuk membuka jalur frontend/backend yang relevan.
              </p>
              <LinkButton to="/profile" size="sm" variant="secondary" className="mt-3 w-full">
                Atur di profil
              </LinkButton>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs text-ink-400">
              <SparklesIcon className="h-4 w-4 text-brand-500" /> Tips hari ini
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-600 dark:text-ink-300">
              Commit kecil dan sering lebih mudah di-review daripada satu commit raksasa. Biasakan satu commit = satu
              perubahan logis.
            </p>
            <p className="mt-3 flex items-center gap-1 text-[10px] text-ink-400">
              <ClockIcon className="h-3 w-3" /> Aktif terakhir: {formatDate(stats.last_active_date) || '—'}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}
