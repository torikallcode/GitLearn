import { Link } from 'react-router-dom'
import { LinkButton } from '../components/ui'
import { ArrowLeftIcon, SearchIcon, TerminalIcon } from '../components/icons'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-100 font-mono text-2xl font-extrabold text-ink-400 dark:bg-ink-800">
        404
      </span>
      <h1 className="mt-5 text-2xl font-extrabold text-ink-950 dark:text-white">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-ink-500">
        Sepertinya kamu berada di branch yang belum ada. Kembali ke jalur utama, atau cari lesson yang kamu butuhkan.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <LinkButton to="/dashboard">
          <ArrowLeftIcon className="h-4 w-4" /> Dashboard
        </LinkButton>
        <LinkButton to="/cheatsheet" variant="secondary">
          <SearchIcon className="h-4 w-4" /> Cheat sheet
        </LinkButton>
      </div>
      <pre className="mt-8 rounded-xl bg-ink-950 px-5 py-3 font-mono text-[11px] text-ink-300">
        <span className="text-brand-400">$</span> git switch main
        <br />
        <span className="text-red-300">fatal: branch 'main' tidak ditemukan</span>
      </pre>
      <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600">
        <TerminalIcon className="h-3.5 w-3.5" /> Kembali ke beranda
      </Link>
    </div>
  )
}
