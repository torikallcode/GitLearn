import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { cx } from '../components/ui'
import { BookIcon, ChevronRightIcon, SearchIcon, TerminalIcon, XIcon } from '../components/icons'

export default function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ lessons: [], cheatsheet: [] })
  const [status, setStatus] = useState('idle')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    setQuery('')
    setResults({ lessons: [], cheatsheet: [] })
    const timer = setTimeout(() => inputRef.current?.focus(), 30)
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults({ lessons: [], cheatsheet: [] })
      setStatus('idle')
      return
    }
    setStatus('loading')
    const timer = setTimeout(() => {
      api
        .search(q)
        .then((data) => {
          setResults({ lessons: data.lessons || [], cheatsheet: data.cheatsheet || [] })
          setStatus('done')
        })
        .catch(() => setStatus('error'))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, open])

  if (!open) return null

  const hasResults = results.lessons.length > 0 || results.cheatsheet.length > 0

  function go(path) {
    onClose()
    navigate(path)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/50 p-4 pt-[10vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-900">
        <div className="flex items-center gap-3 border-b border-ink-100 px-4 dark:border-ink-800">
          <SearchIcon className="h-5 w-5 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari lesson, command, atau topik…"
            className="h-14 flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none dark:text-white"
            aria-label="Kata kunci pencarian"
          />
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
            aria-label="Tutup pencarian"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {status === 'idle' && (
            <p className="px-3 py-8 text-center text-sm text-ink-400">
              Ketik minimal 2 karakter. Coba “merge”, “rebase”, atau “pull”.
            </p>
          )}
          {status === 'loading' && <p className="px-3 py-8 text-center text-sm text-ink-400">Mencari…</p>}
          {status === 'error' && (
            <p className="px-3 py-8 text-center text-sm text-red-500">Pencarian gagal. Coba lagi.</p>
          )}
          {status === 'done' && !hasResults && (
            <p className="px-3 py-8 text-center text-sm text-ink-400">Tidak ada hasil untuk “{query}”.</p>
          )}

          {results.lessons.length > 0 && (
            <div className="mb-2">
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-ink-400">Lesson</p>
              {results.lessons.map((lesson) => (
                <button
                  key={lesson.slug}
                  type="button"
                  onClick={() => go(`/lessons/${lesson.slug}`)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  <BookIcon className="h-4 w-4 shrink-0 text-brand-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                      {lesson.title}
                    </span>
                    <span className="block truncate text-xs text-ink-400">
                      {[lesson.path_title, lesson.module_title].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 text-ink-300" />
                </button>
              ))}
            </div>
          )}

          {results.cheatsheet.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-ink-400">Command</p>
              {results.cheatsheet.map((item) => (
                <button
                  key={item.id || item.command}
                  type="button"
                  onClick={() => go(`/cheatsheet?q=${encodeURIComponent(item.command)}`)}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  <TerminalIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="min-w-0 flex-1">
                    <code className="block truncate font-mono text-xs font-semibold text-ink-800 dark:text-ink-100">
                      {item.command}
                    </code>
                    <span className="block truncate text-xs text-ink-400">{item.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={cx('border-t border-ink-100 px-4 py-2 text-[11px] text-ink-400 dark:border-ink-800')}>
          <span className="font-mono">Esc</span> untuk menutup · <span className="font-mono">Ctrl K</span> untuk membuka
        </div>
      </div>
    </div>
  )
}
