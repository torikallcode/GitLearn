import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { useAuth } from '../../store'
import { Button, Card, Spinner } from '../../components/ui'
import { UserIcon, XCircleIcon } from '../../components/icons'
import { formatDate } from '../../utils/format'

export default function Comments({ slug }) {
  const { user, accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['comments', slug],
    queryFn: () => api.comments(slug),
  })

  const addMutation = useMutation({
    mutationFn: () => api.addComment(slug, content.trim()),
    onSuccess: () => {
      setContent('')
      setError('')
      queryClient.invalidateQueries({ queryKey: ['comments', slug] })
    },
    onError: (err) => setError(err.message || 'Gagal mengirim komentar.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', slug] }),
  })

  function submit(e) {
    e.preventDefault()
    if (content.trim().length < 2) {
      setError('Tulis minimal 2 karakter.')
      return
    }
    addMutation.mutate()
  }

  const comments = data || []

  return (
    <Card className="mt-6 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900 dark:text-white">
        <UserIcon className="h-5 w-5 text-brand-500" /> Diskusi lesson
      </h2>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
        Tanya, bagikan tips, atau bantu learner lain. Tetap sopan dan relevan.
      </p>

      {accessToken ? (
        <form onSubmit={submit} className="mt-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Tulis pertanyaan atau insight…"
            className="block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-ink-400">{content.length}/2000</span>
            <Button type="submit" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : null}
              {addMutation.isPending ? 'Mengirim…' : 'Kirim komentar'}
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </form>
      ) : (
        <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500 dark:bg-ink-800/50 dark:text-ink-400">
          Masuk untuk ikut berdiskusi.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <p className="text-xs text-ink-400">Memuat diskusi…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-ink-400">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          comments.map((comment) => {
            const canDelete = accessToken && (comment.user_id === user?.id || user?.role === 'admin')
            return (
              <div key={comment.id} className="flex gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {comment.user_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-ink-800 dark:text-ink-100">{comment.user_name}</p>
                    <span className="text-[10px] text-ink-400">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{comment.content}</p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(comment.id)}
                    className="self-start text-ink-400 hover:text-red-500"
                    aria-label="Hapus komentar"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
