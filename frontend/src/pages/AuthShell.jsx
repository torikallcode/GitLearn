import { Link } from 'react-router-dom'
import { Card, Logo } from '../components/ui'
import { CheckIcon, CodeIcon, BranchIcon, TerminalIcon } from '../components/icons'

const perks = [
  'Terminal simulator & commit graph di browser',
  'Jalur Fundamental lengkap: init sampai undo',
  'Kuis, progress, XP, dan review terjadwal',
  'Materi berbahasa Indonesia, tanpa instalasi',
]

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>}
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-ink-200 bg-ink-950 lg:flex lg:flex-col lg:justify-center dark:border-ink-800">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>
        <div className="relative px-12 xl:px-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-brand-200">
            <TerminalIcon className="h-3.5 w-3.5" /> Belajar by doing
          </span>
          <h2 className="mt-5 max-w-lg text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            Tempat aman untuk salah command.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-300">
            Latih <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-brand-200">reset --hard</code>, merge conflict, dan rebase tanpa risiko kehilangan pekerjaan.
          </p>

          <div className="mt-8 space-y-3">
            {perks.map((perk) => (
              <div key={perk} className="flex items-start gap-3 text-sm text-ink-200">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {perk}
              </div>
            ))}
          </div>

          <Card className="mt-10 max-w-md border-white/10 bg-white/5 p-4 text-ink-200 shadow-none">
            <div className="flex items-center gap-2 text-xs text-ink-400">
              <BranchIcon className="h-4 w-4 text-brand-300" /> commit graph
            </div>
            <pre className="mt-2 font-mono text-[11px] leading-5 text-ink-300">
{`● 9f2c1ab (HEAD -> main) feat: form login
│
● 4b7d0e2 chore: setup project
│
● 1a2b3c4 chore: initial commit`}
            </pre>
          </Card>

          <p className="mt-8 flex items-center gap-2 text-xs text-ink-400">
            <CodeIcon className="h-4 w-4" /> Cocok untuk calon frontend & backend engineer
          </p>
        </div>
      </div>
    </div>
  )
}

export function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink-700 dark:text-ink-200">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 dark:bg-ink-900 dark:text-white dark:ring-ink-700'

export function FormError({ children }) {
  if (!children) return null
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
      {children}
    </div>
  )
}

export function AuthFooterLink({ text, to, label }) {
  return (
    <p className="text-center text-sm text-ink-500">
      {text}{' '}
      <Link to={to} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
        {label}
      </Link>
    </p>
  )
}
