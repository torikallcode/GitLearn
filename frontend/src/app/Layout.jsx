import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useTheme } from '../store'
import { Logo, Button, cx } from '../components/ui'
import {
  AwardIcon,
  BookIcon,
  ChevronDownIcon,
  CloseIcon,
  HomeIcon,
  LogOutIcon,
  MapIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  TerminalIcon,
  UserIcon,
} from '../components/icons'
import SearchModal from './SearchModal'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon, auth: true },
  { to: '/paths', label: 'Jalur Belajar', icon: MapIcon },
  { to: '/cheatsheet', label: 'Cheat Sheet', icon: BookIcon },
]

export default function Layout() {
  const { user, accessToken, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const userRef = useRef(null)

  useEffect(() => {
    setMenuOpen(false)
    setUserOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    function onClick(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/85 backdrop-blur-lg dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to={accessToken ? '/dashboard' : '/'} aria-label="GitLearn beranda">
            <Logo />
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
            {navItems
              .filter((item) => !item.auth || accessToken)
              .map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cx(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-9 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-xs text-ink-400 transition-colors hover:border-ink-300 hover:text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-ink-600 sm:flex"
              aria-label="Cari lesson atau command"
            >
              <SearchIcon className="h-4 w-4" />
              <span>Cari…</span>
              <kbd className="ml-4 rounded border border-ink-200 px-1.5 py-0.5 font-mono text-[10px] dark:border-ink-700">
                Ctrl K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 sm:hidden"
              aria-label="Cari"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggle}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
              aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>

            {accessToken ? (
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg p-1 pl-2 hover:bg-ink-100 dark:hover:bg-ink-800"
                  aria-expanded={userOpen}
                  aria-haspopup="menu"
                >
                  <span className="hidden max-w-[120px] truncate text-sm font-medium text-ink-700 dark:text-ink-200 sm:block">
                    {user?.name?.split(' ')[0] || 'Akun'}
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {(user?.name || 'G').charAt(0).toUpperCase()}
                  </span>
                  <ChevronDownIcon className="hidden h-4 w-4 text-ink-400 sm:block" />
                </button>
                {userOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-ink-200 bg-white py-1.5 shadow-xl dark:border-ink-700 dark:bg-ink-900"
                  >
                    <div className="border-b border-ink-100 px-3 pb-2 dark:border-ink-800">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{user?.name}</p>
                      <p className="truncate text-xs text-ink-500">{user?.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800"
                    >
                      <UserIcon className="h-4 w-4" /> Profil & statistik
                    </Link>
                    <Link
                      to="/certificate"
                      role="menuitem"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800"
                    >
                      <AwardIcon className="h-4 w-4" /> Sertifikat
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOutIcon className="h-4 w-4" /> Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                >
                  Masuk
                </Link>
                <Button as={Link} to="/register" size="sm">
                  Daftar gratis
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 md:hidden"
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-ink-200 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-950 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems
                .filter((item) => !item.auth || accessToken)
                .map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </NavLink>
                ))}
              {accessToken ? (
                <>
                  <NavLink
                    to="/review"
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                  >
                    <TerminalIcon className="h-4 w-4" /> Review hari ini
                  </NavLink>
                  <NavLink
                    to="/profile"
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                  >
                    <UserIcon className="h-4 w-4" /> Profil
                  </NavLink>
                </>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button as={Link} to="/login" variant="secondary" className="flex-1">
                    Masuk
                  </Button>
                  <Button as={Link} to="/register" className="flex-1">
                    Daftar
                  </Button>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-ink-400 sm:flex-row sm:px-6 lg:px-8">
          <Logo className="scale-90 opacity-80" />
          <p>Belajar Git & GitHub dengan praktik langsung. Simulasi aman, tanpa takut merusak repository.</p>
          <p>© {new Date().getFullYear()} GitLearn</p>
        </div>
      </footer>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
