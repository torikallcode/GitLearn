import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../store'
import { Badge, Card, PageLoader } from '../components/ui'
import { FlameIcon, TrophyIcon, ZapIcon } from '../components/icons'

export default function Leaderboard() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({ queryKey: ['leaderboard'], queryFn: () => api.leaderboard(20) })

  if (isLoading) return <PageLoader label="Memuat peringkat…" />
  if (error) return <p className="px-4 py-16 text-center text-sm text-red-500">{error.message}</p>

  const rows = data || []
  const me = rows.find((row) => row.user_id === user?.id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Komunitas</p>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
          <TrophyIcon className="h-7 w-7 text-amber-500" /> Peringkat XP
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-500 dark:text-ink-400">
          Kumpulkan XP dari praktik, menyelesaikan lesson, dan menjawab kuis. Peringkat diperbarui otomatis.
        </p>
        {me && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            Posisimu: #{me.rank} · {me.xp} XP
          </div>
        )}
      </div>

      <Card className="mt-6 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-400">Belum ada data peringkat. Selesaikan lesson pertama!</p>
        ) : (
          <ol className="divide-y divide-ink-100 dark:divide-ink-800">
            {rows.map((row) => {
              const isMe = row.user_id === user?.id
              return (
                <li
                  key={row.user_id}
                  className={isMe ? 'flex items-center gap-4 bg-brand-50/60 px-4 py-3 dark:bg-brand-900/20' : 'flex items-center gap-4 px-4 py-3'}
                >
                  <span className="w-8 shrink-0 text-center text-sm font-bold text-ink-400">
                    {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {row.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {row.name} {isMe && <Badge tone="brand">Kamu</Badge>}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      Streak {row.current_streak} hari · terpanjang {row.longest_streak}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                    <ZapIcon className="h-4 w-4" /> {row.xp}
                  </span>
                  <span className="hidden items-center gap-1 text-xs text-ink-400 sm:inline-flex">
                    <FlameIcon className="h-3.5 w-3.5" /> {row.current_streak}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    </div>
  )
}
