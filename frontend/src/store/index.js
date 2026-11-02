import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuth = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, access_token, refresh_token }) =>
        set({ user, accessToken: access_token, refreshToken: refresh_token }),
      setUser: (user) => set({ user }),
      setTokens: ({ access_token, refresh_token }) =>
        set({ accessToken: access_token, refreshToken: refresh_token }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'gitlearn-auth' },
  ),
)

export const useTheme = create(
  persist(
    (set, get) => ({
      theme: 'light',
      toggle: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: next })
        document.documentElement.classList.toggle('dark', next === 'dark')
      },
      init: () => document.documentElement.classList.toggle('dark', get().theme === 'dark'),
    }),
    {
      name: 'gitlearn-theme',
      onRehydrateStorage: () => (state) => state?.init(),
    },
  ),
)
