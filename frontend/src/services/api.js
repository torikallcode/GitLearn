const BASE = import.meta.env.VITE_API_URL || '/api/v1'

export class ApiError extends Error {
  constructor(message, { code, details, status } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.status = status
  }
}

let refreshPromise = null

async function readBody(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function getAuth() {
  // Imported lazily to avoid a circular dependency with the store.
  try {
    const raw = localStorage.getItem('gitlearn-auth')
    return raw ? JSON.parse(raw)?.state : null
  } catch {
    return null
  }
}

function saveAuth(patch) {
  try {
    const raw = localStorage.getItem('gitlearn-auth')
    if (!raw) return
    const parsed = JSON.parse(raw)
    localStorage.setItem('gitlearn-auth', JSON.stringify({ ...parsed, state: { ...parsed.state, ...patch } }))
  } catch {
    localStorage.removeItem('gitlearn-auth')
  }
}

async function refreshTokens() {
  const auth = getAuth()
  if (!auth?.refreshToken) return null
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: auth.refreshToken }),
    })
      .then(async (res) => {
        const body = await readBody(res)
        if (!res.ok || !body?.success) return null
        saveAuth({ accessToken: body.data.access_token, refreshToken: body.data.refresh_token })
        return body.data.access_token
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function request(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const session = getAuth()
  if (auth && session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401 && auth && retry && session?.refreshToken) {
    const token = await refreshTokens()
    if (token) return request(path, { method, body, auth, retry: false })
    localStorage.removeItem('gitlearn-auth')
  }

  const payload = await readBody(res)
  if (!res.ok || payload?.success === false) {
    const err = payload?.error || {}
    throw new ApiError(payload?.message || 'Terjadi kesalahan pada server.', {
      code: err.code,
      details: err.details,
      status: res.status,
    })
  }
  return payload?.data
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body, auth: false }),
  login: (body) => request('/auth/login', { method: 'POST', body, auth: false }),
  me: () => request('/auth/me'),
  updateMe: (body) => request('/users/me', { method: 'PATCH', body }),

  paths: () => request('/paths'),
  path: (slug) => request(`/paths/${encodeURIComponent(slug)}`),
  lesson: (slug) => request(`/lessons/${encodeURIComponent(slug)}`),
  quizzes: (slug) => request(`/lessons/${encodeURIComponent(slug)}/quizzes`),
  cheatsheet: (q = '') => request(`/cheatsheet${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  completePractice: (slug) => request(`/lessons/${encodeURIComponent(slug)}/practice/complete`, { method: 'POST' }),
  answerQuiz: (id, optionId) => request(`/quizzes/${id}/answer`, { method: 'POST', body: { option_id: optionId } }),
  completeLesson: (slug, body = {}) =>
    request(`/lessons/${encodeURIComponent(slug)}/complete`, { method: 'POST', body }),

  progress: () => request('/progress'),
  nextLesson: () => request('/progress/next'),
  reviews: () => request('/reviews/today'),
  answerReview: (id, optionId) =>
    request(`/reviews/${id}/answer`, { method: 'POST', body: { option_id: optionId } }),
  stats: () => request('/stats'),
  certificate: () => request('/certificate'),
  publicCertificate: (code) => request(`/certificates/${encodeURIComponent(code)}`, { auth: false }),
}
