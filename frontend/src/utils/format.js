export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatRelative(value) {
  if (!value) return '—'
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) return 'hari ini'
  if (days === 1) return 'kemarin'
  if (days < 30) return `${days} hari lalu`
  return formatDate(value)
}

export function plural(n, word) {
  return `${n} ${word}`
}

export function statusLabel(status) {
  return { completed: 'Selesai', in_progress: 'Sedang belajar', not_started: 'Belum mulai' }[status] || 'Belum mulai'
}

export function achievementEmoji(code = '') {
  if (code.includes('streak')) return '🔥'
  if (code.includes('quiz')) return '🎯'
  if (code.includes('fundamental') || code.includes('core') || code.includes('master')) return '🏆'
  return '⭐'
}
