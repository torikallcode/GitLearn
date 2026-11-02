import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { Badge, Button, Card, EmptyState, PageLoader, cx } from '../components/ui'
import { BookIcon, CheckIcon, CopyIcon, SearchIcon, TerminalIcon } from '../components/icons'

const categoryTone = {
  Dasar: 'brand',
  Branch: 'emerald',
  Remote: 'amber',
  Undo: 'red',
  Konfigurasi: 'ink',
  Riwayat: 'brand',
  Rebase: 'amber',
  Debug: 'red',
  Release: 'emerald',
  Otomasi: 'brand',
  Keamanan: 'red',
  Deploy: 'emerald',
  CI: 'brand',
  Review: 'amber',
  GitHub: 'ink',
  Kolaborasi: 'emerald',
}

export default function CheatSheet() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const [category, setCategory] = useState('Semua')
  const [copied, setCopied] = useState(null)

  const { data, isLoading, error } = useQuery({ queryKey: ['cheatsheet'], queryFn: () => api.cheatsheet() })

  useEffect(() => {
    setQuery(params.get('q') || '')
  }, [params])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const categories = useMemo(() => {
    const set = new Set((data || []).map((item) => item.category))
    return ['Semua', ...Array.from(set).sort()]
  }, [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data || []).filter((item) => {
      if (category !== 'Semua' && item.category !== category) return false
      if (!q) return true
      return [item.command, item.description, item.example, item.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    })
  }, [data, query, category])

  const grouped = useMemo(() => {
    return filtered.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [filtered])

  function updateQuery(value) {
    setQuery(value)
    if (value) setParams({ q: value }, { replace: true })
    else setParams({}, { replace: true })
  }

  async function copy(item) {
    try {
      await navigator.clipboard.writeText(item.command)
      setCopied(item.id || item.command)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">Referensi</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">Cheat Sheet Git</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-500 dark:text-ink-400">
              Cari command, baca penjelasan singkat, dan salin contohnya. Semua command di sini bisa dilatih di terminal
              simulator.
            </p>
          </div>
          <Badge tone="brand" className="px-3 py-1.5">
            <BookIcon className="h-3.5 w-3.5" /> {data?.length || 0} command
          </Badge>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="Cari command, mis. rebase, stash, push…"
              className="h-11 w-full rounded-xl border-0 bg-ink-50 pl-9 pr-3 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 dark:bg-ink-800 dark:text-white dark:ring-ink-700"
              aria-label="Cari command"
            />
          </div>
          {query && (
            <Button variant="secondary" onClick={() => updateQuery('')}>
              Bersihkan
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cx(
                'rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors',
                category === cat
                  ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <PageLoader label="Memuat cheat sheet…" />}
      {error && <p className="py-10 text-center text-sm text-red-500">{error.message}</p>}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Command tidak ditemukan"
            description={`Tidak ada hasil untuk “${query}”. Coba kata kunci lain seperti merge, reset, atau remote.`}
            action={<Button variant="secondary" onClick={() => { updateQuery(''); setCategory('Semua') }}>Reset filter</Button>}
          />
        </div>
      )}

      <div className="mt-8 space-y-8">
        {Object.entries(grouped).map(([cat, items]) => (
          <section key={cat}>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                <TerminalIcon className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-ink-900 dark:text-white">{cat}</h2>
              <Badge>{items.length}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <Card key={item.id || item.command} className="group p-4">
                  <div className="flex items-start justify-between gap-2">
                    <code className="break-all font-mono text-[13px] font-semibold text-brand-700 dark:text-brand-300">
                      {item.command}
                    </code>
                    <Badge tone={categoryTone[cat] || 'ink'}>{item.category}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-600 dark:text-ink-300">{item.description}</p>
                  {item.example && item.example !== item.command && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950 px-3 py-2 font-mono text-[10.5px] text-ink-200">
                      {item.example}
                    </pre>
                  )}
                  {item.example === item.command && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950 px-3 py-2 font-mono text-[10.5px] text-ink-200">
                      {item.example}
                    </pre>
                  )}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => copy(item)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100"
                    >
                      {copied === (item.id || item.command) ? (
                        <>
                          <CheckIcon className="h-3.5 w-3.5 text-emerald-500" /> Tersalin
                        </>
                      ) : (
                        <>
                          <CopyIcon className="h-3.5 w-3.5" /> Salin
                        </>
                      )}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
