import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Badge, Button, Card, PageLoader, Spinner, cx } from '../components/ui'
import { CheckCircleIcon, TerminalIcon, XCircleIcon } from '../components/icons'

const emptyQuiz = () => ({
  id: null,
  question: '',
  explanation: '',
  order_no: 0,
  options: [
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ],
})

export default function Admin() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const { data: lessons, isLoading, error } = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: api.adminLessons,
  })

  if (isLoading) return <PageLoader label="Memuat konten…" />
  if (error) return <p className="px-4 py-16 text-center text-sm text-red-500">{error.message}</p>

  const rows = lessons || []
  const selected = rows.find((lesson) => lesson.id === selectedId) || rows[0]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          <TerminalIcon className="h-4 w-4" /> CMS
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">Kelola konten</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Edit lesson, atur publikasi, dan kelola kuis. Perubahan langsung tampil di aplikasi.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <Card className="max-h-[70vh] overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-ink-400">Belum ada lesson.</p>
          ) : (
            <ul className="space-y-1">
              {rows.map((lesson) => (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(lesson.id)}
                    className={cx(
                      'w-full rounded-lg px-3 py-2 text-left transition-colors',
                      selected?.id === lesson.id
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
                    )}
                  >
                    <span className="block truncate text-sm font-semibold">{lesson.title}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-400">
                      {lesson.path_title}
                      {!lesson.is_published && <Badge tone="amber">draft</Badge>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected ? (
          <LessonEditor key={selected.id} lesson={selected} onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-lessons'] })} />
        ) : (
          <Card className="p-8 text-sm text-ink-400">Pilih lesson untuk mulai mengedit.</Card>
        )}
      </div>
    </div>
  )
}

function LessonEditor({ lesson, onSaved }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: lesson.title,
    content_md: lesson.content_md,
    estimated_minutes: lesson.estimated_minutes,
    order_no: lesson.order_no,
    is_published: lesson.is_published,
  })
  const [message, setMessage] = useState('')
  const [quizForm, setQuizForm] = useState(null)

  const saveMutation = useMutation({
    mutationFn: () =>
      api.adminUpdateLesson(lesson.id, {
        ...form,
        estimated_minutes: Number(form.estimated_minutes),
        order_no: Number(form.order_no),
      }),
    onSuccess: () => {
      setMessage('Lesson tersimpan.')
      onSaved()
    },
    onError: (err) => setMessage(err.message || 'Gagal menyimpan.'),
  })

  const { data: quizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ['admin-quizzes', lesson.id],
    queryFn: () => api.adminQuizzes(lesson.id),
  })

  const quizMutation = useMutation({
    mutationFn: (payload) =>
      payload.id ? api.adminUpdateQuiz(payload.id, payload.body) : api.adminCreateQuiz(lesson.id, payload.body),
    onSuccess: () => {
      setQuizForm(null)
      setMessage('Kuis tersimpan.')
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes', lesson.id] })
      onSaved()
    },
    onError: (err) => setMessage(err.message || 'Gagal menyimpan kuis.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.adminDeleteQuiz(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes', lesson.id] })
      onSaved()
    },
    onError: (err) => setMessage(err.message || 'Gagal menghapus kuis.'),
  })

  function submitQuiz(e) {
    e.preventDefault()
    const body = {
      question: quizForm.question,
      explanation: quizForm.explanation,
      order_no: Number(quizForm.order_no) || 0,
      options: quizForm.options
        .filter((option) => option.option_text.trim())
        .map((option) => ({ option_text: option.option_text.trim(), is_correct: option.is_correct })),
    }
    quizMutation.mutate({ id: quizForm.id, body })
  }

  function editQuiz(quiz) {
    setQuizForm({
      id: quiz.id,
      question: quiz.question,
      explanation: quiz.explanation,
      order_no: quiz.order_no,
      options: quiz.options.map((option) => ({ option_text: option.option_text, is_correct: option.is_correct })),
    })
  }

  function setOption(index, patch) {
    setQuizForm((prev) => ({
      ...prev,
      options: prev.options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    }))
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">Lesson</h2>
          <Badge tone={form.is_published ? 'emerald' : 'amber'}>{form.is_published ? 'published' : 'draft'}</Badge>
          <span className="text-xs text-ink-400">{lesson.path_title} / {lesson.module_title}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Judul</span>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Estimasi menit</span>
            <input
              type="number"
              min="1"
              value={form.estimated_minutes}
              onChange={(e) => setForm((prev) => ({ ...prev, estimated_minutes: e.target.value }))}
              className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Urutan</span>
            <input
              type="number"
              min="0"
              value={form.order_no}
              onChange={(e) => setForm((prev) => ({ ...prev, order_no: e.target.value }))}
              className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
              className="h-4 w-4 accent-brand-600"
            />
            <span className="text-sm text-ink-700 dark:text-ink-200">Publikasikan lesson</span>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Konten Markdown</span>
          <textarea
            value={form.content_md}
            onChange={(e) => setForm((prev) => ({ ...prev, content_md: e.target.value }))}
            rows={18}
            className="block w-full rounded-lg border-0 bg-white px-3 py-2 font-mono text-xs leading-relaxed ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Spinner className="h-4 w-4" /> : null}
            {saveMutation.isPending ? 'Menyimpan…' : 'Simpan lesson'}
          </Button>
          {message && <span className="text-xs text-ink-500 dark:text-ink-400">{message}</span>}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink-900 dark:text-white">Kuis</h2>
            <p className="text-xs text-ink-400">{quizzes?.length || 0} kuis pada lesson ini.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setQuizForm(emptyQuiz())}>
            Tambah kuis
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {quizzesLoading ? (
            <p className="text-xs text-ink-400">Memuat kuis…</p>
          ) : (quizzes || []).length === 0 ? (
            <p className="text-xs text-ink-400">Belum ada kuis.</p>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{quiz.question}</p>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => editQuiz(quiz)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm('Hapus kuis ini?')) deleteMutation.mutate(quiz.id)
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {quiz.options.map((option) => (
                    <li key={option.id} className="flex items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
                      {option.is_correct ? (
                        <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <XCircleIcon className="h-3.5 w-3.5 text-ink-300 dark:text-ink-600" />
                      )}
                      {option.option_text}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {quizForm && (
          <form onSubmit={submitQuiz} className="mt-5 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-800 dark:bg-brand-900/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900 dark:text-white">
                {quizForm.id ? 'Edit kuis' : 'Kuis baru'}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setQuizForm(null)}>
                Batal
              </Button>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Pertanyaan</span>
              <input
                value={quizForm.question}
                onChange={(e) => setQuizForm((prev) => ({ ...prev, question: e.target.value }))}
                className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
              />
            </label>
            <label className="mt-2 block">
              <span className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Penjelasan</span>
              <textarea
                value={quizForm.explanation}
                onChange={(e) => setQuizForm((prev) => ({ ...prev, explanation: e.target.value }))}
                rows={2}
                className="block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
              />
            </label>
            <div className="mt-3 space-y-2">
              <span className="block text-xs font-semibold text-ink-600 dark:text-ink-300">Opsi (pilih satu jawaban benar)</span>
              {quizForm.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${lesson.id}`}
                    checked={option.is_correct}
                    onChange={() =>
                      setQuizForm((prev) => ({
                        ...prev,
                        options: prev.options.map((item, i) => ({ ...item, is_correct: i === index })),
                      }))
                    }
                    className="h-4 w-4 accent-brand-600"
                  />
                  <input
                    value={option.option_text}
                    onChange={(e) => setOption(index, { option_text: e.target.value })}
                    placeholder={`Opsi ${index + 1}`}
                    className="block w-full rounded-lg border-0 bg-white px-3 py-1.5 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500 dark:bg-ink-950 dark:text-white dark:ring-ink-700"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Button type="submit" size="sm" disabled={quizMutation.isPending}>
                {quizMutation.isPending ? 'Menyimpan…' : 'Simpan kuis'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
