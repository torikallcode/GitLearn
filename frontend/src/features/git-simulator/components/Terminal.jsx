import { useEffect, useRef, useState } from 'react'
import { cx } from '../../../components/ui'
import { RotateIcon, TerminalIcon } from '../../../components/icons'

export default function Terminal({ lines = [], onCommand, onReset, suggestions = [], title = 'Terminal simulator' }) {
  const [value, setValue] = useState('')
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  function submit(e) {
    e.preventDefault()
    const command = value.trim()
    if (!command) return
    onCommand?.(command)
    setHistory((prev) => [...prev, command])
    setHistoryIndex(-1)
    setValue('')
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!history.length) return
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(next)
      setValue(history[next])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex < 0) return
      const next = historyIndex + 1
      if (next >= history.length) {
        setHistoryIndex(-1)
        setValue('')
      } else {
        setHistoryIndex(next)
        setValue(history[next])
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      onCommand?.('clear')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-ink-400">
          <TerminalIcon className="h-3.5 w-3.5" />
          <span className="font-mono">{title}</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-ink-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Reset sandbox"
        >
          <RotateIcon className="h-3 w-3" /> Reset
        </button>
      </div>

      <div
        ref={scrollRef}
        className="h-56 overflow-y-auto px-3 py-3 font-mono text-[11.5px] leading-5 scrollbar-thin sm:h-64"
        aria-live="polite"
        aria-label="Output terminal"
      >
        {lines.length === 0 && <p className="text-ink-500">Terminal bersih. Ketik command Git…</p>}
        {lines.map((line, i) => (
          <div
            key={i}
            className={cx(
              'whitespace-pre-wrap break-words',
              line.type === 'cmd' && 'mt-1 text-emerald-300',
              line.type === 'error' && 'text-red-300',
              line.type === 'muted' && 'text-ink-500',
              line.type === 'success' && 'text-emerald-300',
              (!line.type || line.type === 'out') && 'text-ink-300',
            )}
          >
            {line.type === 'cmd' ? <span className="select-none text-brand-400">$ </span> : null}
            {line.text}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
        <span className="select-none font-mono text-xs text-brand-400">$</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-white placeholder:text-ink-600 focus:outline-none"
          placeholder="git status"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          aria-label="Command Git"
        />
        <button
          type="submit"
          className="rounded-md bg-white/10 px-2 py-1 font-mono text-[10px] font-semibold text-ink-200 hover:bg-white/20"
        >
          Run ↵
        </button>
      </form>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-3 py-2">
          {suggestions.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => {
                setValue(cmd)
                inputRef.current?.focus()
              }}
              className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-ink-400 transition-colors hover:border-brand-400/40 hover:text-white"
            >
              {cmd}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
