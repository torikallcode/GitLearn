import { Link } from 'react-router-dom'
import clsx from './clsx'

export function cx(...args) {
  return clsx(...args)
}

const variants = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 disabled:bg-brand-300 dark:disabled:bg-brand-900',
  secondary:
    'bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 disabled:text-ink-400 dark:bg-ink-900 dark:text-ink-100 dark:ring-ink-700 dark:hover:bg-ink-800',
  ghost:
    'text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:text-ink-300 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function Button({ as: Tag = 'button', variant = 'primary', size = 'md', className, ...props }) {
  return (
    <Tag
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function LinkButton({ to, variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <Link
      to={to}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  )
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-ink-200/80 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ProgressBar({ value = 0, className, label, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
  }
  return (
    <div
      className={cx('h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800', className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progres'}
    >
      <div
        className={cx('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function Badge({ children, tone = 'ink', className }) {
  const tones = {
    ink: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Memuat"
      className={cx(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  )
}

export function PageLoader({ label = 'Memuat…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-400">
      <Spinner />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 px-6 py-14 text-center dark:border-ink-700">
      {icon && <div className="mb-3 text-ink-400">{icon}</div>}
      <h3 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">{eyebrow}</p>
        )}
        <h2 className="text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-500 dark:text-ink-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Logo({ className }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-extrabold tracking-tight', className)}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="6" cy="6" r="2.4" />
          <circle cx="6" cy="18" r="2.4" />
          <circle cx="18" cy="12" r="2.4" />
          <path d="M6 8.4v7.2M8.4 6H12a6 6 0 0 1 6 6v0" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg text-ink-900 dark:text-white">
        Git<span className="text-brand-600 dark:text-brand-400">Learn</span>
      </span>
    </span>
  )
}

export function Stat({ label, value, icon, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
  }
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink-500 dark:text-ink-400">{label}</p>
        <p className="text-lg font-bold leading-tight text-ink-900 dark:text-white">{value}</p>
        {hint && <p className="truncate text-[11px] text-ink-400">{hint}</p>}
      </div>
    </Card>
  )
}
