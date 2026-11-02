import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../store'
import { Badge, Button, Card, LinkButton, ProgressBar, cx } from '../components/ui'
import {
  ArrowRightIcon,
  BranchIcon,
  BulbIcon,
  CheckIcon,
  CodeIcon,
  FlameIcon,
  LockIcon,
  PlayIcon,
  RotateIcon,
  SparklesIcon,
  TargetIcon,
  TerminalIcon,
  TrophyIcon,
  ZapIcon,
} from '../components/icons'
import { createRepo, graphLayout, runCommand } from '../features/git-simulator/engine'

const demoCommands = ['git status', 'git add README.md', 'git commit -m "docs: tambah README"']

function HeroTerminal() {
  const [state, setState] = useState(() => createRepo('initialized'))
  const [lines, setLines] = useState([
    { type: 'muted', text: 'Sandbox demo — coba command di bawah, graph ikut berubah.' },
    { type: 'cmd', text: 'git status' },
  ])
  const graph = useMemo(() => graphLayout(state), [state])

  function run(cmd) {
    const result = runCommand(state, cmd)
    setState(result.state)
    setLines((prev) => [
      ...prev,
      { type: 'cmd', text: cmd },
      ...result.output.map((text) => ({ type: result.error ? 'error' : 'out', text })),
    ])
  }

  function reset() {
    setState(createRepo('initialized'))
    setLines([{ type: 'muted', text: 'Sandbox di-reset. Coba lagi dari awal.' }])
  }

  return (
    <Card className="overflow-hidden border-ink-800 bg-ink-950 text-ink-100 shadow-2xl shadow-brand-950/40">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 font-mono text-[11px] text-ink-400">gitlearn — sandbox</span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-ink-400 hover:bg-white/10 hover:text-white"
        >
          <RotateIcon className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      <div className="grid gap-0 sm:grid-cols-[1.15fr_.85fr]">
        <div className="h-52 overflow-y-auto p-4 font-mono text-[11.5px] leading-5 scrollbar-thin" aria-live="polite">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cx(
                'whitespace-pre-wrap break-words',
                line.type === 'cmd' && 'text-emerald-300',
                line.type === 'error' && 'text-red-300',
                line.type === 'muted' && 'text-ink-500',
                line.type === 'out' && 'text-ink-300',
              )}
            >
              {line.type === 'cmd' ? <span className="text-brand-400">$ </span> : null}
              {line.text}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 bg-black/20 p-3 sm:border-l sm:border-t-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-500">Commit graph</p>
          <svg viewBox={`0 0 ${Math.max(graph.width, 150)} ${Math.max(graph.height, 90)}`} className="w-full" role="img" aria-label="Visualisasi commit graph demo">
            {graph.edges.map((edge, i) => {
              const from = graph.nodes.find((n) => n.id === edge.from)
              const to = graph.nodes.find((n) => n.id === edge.to)
              if (!from || !to) return null
              return (
                <path
                  key={i}
                  d={`M ${from.x + 10} ${from.y + 10} C ${from.x + 10} ${from.y + 40}, ${to.x + 10} ${to.y - 20}, ${to.x + 10} ${to.y + 10}`}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth="2"
                  opacity="0.7"
                />
              )
            })}
            {graph.nodes.map((node) => (
              <g key={node.id}>
                <circle cx={node.x + 10} cy={node.y + 10} r={node.isHead ? 7 : 5.5} fill={node.isHead ? '#fff' : '#0f172a'} stroke={node.branches[0] ? '#608afa' : '#64748b'} strokeWidth="2.5" />
                {node.branches.slice(0, 1).map((b) => (
                  <text key={b} x={node.x + 22} y={node.y + 8} fill="#93b4fd" fontSize="8" fontFamily="monospace">
                    {b}
                  </text>
                ))}
                <text x={node.x + 22} y={node.y + 19} fill="#64748b" fontSize="8" fontFamily="monospace">
                  {node.shortId}
                </text>
              </g>
            ))}
          </svg>
          {graph.nodes.length === 0 && (
            <p className="mt-8 text-center font-mono text-[10px] text-ink-500">Belum ada commit</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-white/10 p-3">
        {demoCommands.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => run(cmd)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10.5px] text-ink-300 transition-colors hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-white"
          >
            {cmd}
          </button>
        ))}
      </div>
    </Card>
  )
}

const steps = [
  {
    icon: BulbIcon,
    title: 'Pahami konsepnya',
    text: 'Analogi nyata dan diagram singkat — bukan dinding teks. Satu konsep per lesson, 5–10 menit.',
  },
  {
    icon: TerminalIcon,
    title: 'Langsung praktik',
    text: 'Terminal simulator di browser. Command asli, state repository virtual, aman untuk salah.',
  },
  {
    icon: BranchIcon,
    title: 'Lihat hasilnya',
    text: 'Commit graph berubah real-time. Kamu melihat branch, HEAD, dan merge, bukan menghafalnya.',
  },
  {
    icon: TargetIcon,
    title: 'Uji & ulangi',
    text: 'Kuis singkat, review terjadwal, XP, dan streak agar progresmu benar-benar menempel.',
  },
]

const features = [
  { icon: TerminalIcon, title: 'Git simulator', text: 'Lebih dari 25 command Git: commit, branch, merge, rebase, reflog, dan lainnya.' },
  { icon: BranchIcon, title: 'Commit graph interaktif', text: 'Setiap commit, branch, dan HEAD divisualisasikan langsung setelah command dijalankan.' },
  { icon: LockIcon, title: 'Safe failure', text: 'Reset sandbox kapan saja. Tidak ada repository nyata yang bisa rusak.' },
  { icon: SparklesIcon, title: 'Hint bertingkat', text: 'Buntu? Buka hint dari samar sampai langkah konkret tanpa langsung dibocorkan.' },
  { icon: FlameIcon, title: 'Streak & XP', text: 'Kebiasaan kecil setiap hari, dengan badge dan sertifikat saat jalur selesai.' },
  { icon: TargetIcon, title: 'Jalur karier', text: 'Spesialisasi frontend atau backend: CI, deploy, release, keamanan, dan review PR.' },
]

export default function Landing() {
  const { accessToken } = useAuth()
  const { data: paths } = useQuery({ queryKey: ['paths'], queryFn: api.paths })

  return (
    <>
      <section className="relative overflow-hidden border-b border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:py-24">
          <div className="animate-fade-up">
            <Badge tone="brand" className="mb-4">
              <SparklesIcon className="h-3.5 w-3.5" /> Belajar sambil praktik, langsung di browser
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-950 dark:text-white sm:text-5xl lg:text-6xl">
              Pahami Git.<br />
              Bukan sekadar <span className="text-brand-600 dark:text-brand-400">hafal command.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-500 dark:text-ink-400 sm:text-lg">
              GitLearn mengajarkan Git &amp; GitHub lewat terminal simulator dan visualisasi commit graph. Dari{' '}
              <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-sm text-brand-700 dark:bg-ink-800 dark:text-brand-200">git init</code>{' '}
              sampai siap kerja di tim — tanpa takut merusak repository.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <LinkButton to={accessToken ? '/dashboard' : '/register'} size="lg">
                {accessToken ? 'Lanjut belajar' : 'Mulai gratis'} <ArrowRightIcon className="h-4 w-4" />
              </LinkButton>
              <LinkButton to="/paths" variant="secondary" size="lg">
                Lihat jalur belajar
              </LinkButton>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-400">
              <span className="inline-flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-500" /> Tanpa instalasi</span>
              <span className="inline-flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-500" /> Bahasa Indonesia</span>
              <span className="inline-flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-500" /> Gratis untuk jalur fundamental</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-tr from-brand-600/20 via-transparent to-emerald-500/20 blur-xl" />
            <HeroTerminal />
            <p className="mt-3 text-center text-[11px] text-ink-400">
              Demo interaktif — klik command, lihat commit graph berubah.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-200 bg-ink-50 py-16 dark:border-ink-800 dark:bg-ink-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { value: '5–10 menit', label: 'per lesson', icon: ZapIcon },
              { value: '25+ command', label: 'disimulasikan interaktif', icon: TerminalIcon },
              { value: '17 lesson', label: 'Jalur Fundamental lengkap', icon: TrophyIcon },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-ink-900 dark:text-white">{value}</p>
                  <p className="text-xs text-ink-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Cara kerja</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
              Satu siklus belajar yang bikin konsepnya nempel
            </h2>
            <p className="mt-3 text-ink-500 dark:text-ink-400">
              Micro-learning, active recall, dan praktik langsung — dirancang untuk pemula yang ingin cepat siap kerja.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <Card key={title} className="relative p-5">
                <span className="absolute right-4 top-4 font-mono text-xs font-bold text-ink-200 dark:text-ink-700">
                  0{index + 1}
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold text-ink-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-ink-200 bg-white py-16 dark:border-ink-800 dark:bg-ink-950 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Kurikulum</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
                Dari nol sampai siap kerja tim
              </h2>
              <p className="mt-3 text-ink-500 dark:text-ink-400">
                Tiga jalur inti, lalu pilih spesialisasi frontend atau backend. Semua materi berbahasa Indonesia.
              </p>
            </div>
            <Link to="/paths" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Semua jalur →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {(paths || []).slice(0, 3).map((path) => (
              <Link key={path.slug} to={`/paths/${path.slug}`} className="group">
                <Card className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-md dark:group-hover:border-brand-700">
                  <div className="flex items-center justify-between">
                    <Badge tone="brand">{path.track === 'core' ? 'Wajib' : path.track === 'collab' ? 'Kolaborasi' : 'Lanjutan'}</Badge>
                    <span className="text-xs text-ink-400">{path.lesson_count} lesson</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-ink-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                    {path.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-3 text-sm text-ink-500 dark:text-ink-400">{path.description}</p>
                  <div className="mt-4">
                    <ProgressBar value={path.progress_percent || 0} />
                    <p className="mt-1.5 text-[11px] text-ink-400">
                      {path.completed_lessons || 0} / {path.lesson_count} lesson selesai
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
            {!paths &&
              [1, 2, 3].map((i) => <Card key={i} className="h-52 animate-pulse bg-ink-100 dark:bg-ink-800" />)}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Fitur</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">
              Semua yang kamu butuhkan untuk benar-benar paham
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <Card key={title} className="p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold text-ink-900 dark:text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-ink-950 px-6 py-12 text-center shadow-2xl sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
              <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-brand-500 blur-3xl" />
              <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-emerald-500 blur-3xl" />
            </div>
            <div className="relative">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white">
                <CodeIcon className="h-6 w-6" />
              </span>
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Repo pertamamu tidak harus jadi korban percobaan.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-ink-300">
                Latih semua command di sandbox aman, lalu bawa kebiasaan baiknya ke repository kerja.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <LinkButton to={accessToken ? '/dashboard' : '/register'} size="lg">
                  <PlayIcon className="h-4 w-4" /> {accessToken ? 'Lanjut belajar' : 'Buat akun gratis'}
                </LinkButton>
                <LinkButton to="/lessons/apa-itu-version-control" variant="secondary" size="lg">
                  Coba lesson pertama
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
