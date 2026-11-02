import { useState } from 'react'
import { Button, Card } from '../../../components/ui'
import { BulbIcon } from '../../../components/icons'

const dictionary = [
  { match: /^git init/, text: 'Membuat repository Git baru di folder saat ini (folder .git).' },
  { match: /^git status/, text: 'Menampilkan branch aktif, file yang berubah, staged, dan untracked.' },
  { match: /^git add/, text: 'Memindahkan perubahan dari working directory ke staging area — “keranjang” sebelum commit.' },
  { match: /^git commit/, text: 'Menyimpan isi staging area sebagai snapshot permanen dengan pesan.' },
  { match: /^git log/, text: 'Melihat riwayat commit. Tambahkan --oneline --graph agar ringkas dan bercabang.' },
  { match: /^git diff/, text: 'Membandingkan perubahan. --staged membandingkan staging dengan commit terakhir.' },
  { match: /^git branch/, text: 'Melihat, membuat, atau menghapus branch (penunjuk ke commit).' },
  { match: /^git switch|^git checkout/, text: 'Berpindah branch atau commit. checkout -b / switch -c membuat branch baru sekaligus pindah.' },
  { match: /^git merge/, text: 'Menggabungkan riwayat branch lain ke branch aktif. Bisa fast-forward atau merge commit.' },
  { match: /^git rebase/, text: 'Memindahkan commit branch ke atas commit lain agar riwayat linear. Jangan rebase branch yang sudah dibagikan.' },
  { match: /^git cherry-pick/, text: 'Menyalin satu commit tertentu ke branch aktif sebagai commit baru.' },
  { match: /^git restore/, text: 'Mengembalikan file dari HEAD atau staging. --staged mengeluarkan file dari staging.' },
  { match: /^git reset/, text: 'Memindahkan HEAD/branch. --soft mempertahankan staging, --mixed (default) mengosongkan staging, --hard menghapus perubahan.' },
  { match: /^git revert/, text: 'Membuat commit baru yang membatalkan commit lama — aman untuk riwayat bersama.' },
  { match: /^git stash/, text: 'Menyimpan perubahan sementara agar working directory bersih, lalu bisa dipop kembali.' },
  { match: /^git clone/, text: 'Menyalin repository remote beserta riwayatnya ke folder lokal.' },
  { match: /^git remote/, text: 'Mengelola koneksi ke repository remote (mis. origin).' },
  { match: /^git fetch/, text: 'Mengambil commit baru dari remote tanpa mengubah branch lokal.' },
  { match: /^git pull/, text: 'fetch + merge (atau rebase) dari remote ke branch aktif.' },
  { match: /^git push/, text: 'Mengirim commit lokal ke remote. -u menyetel upstream branch.' },
  { match: /^git tag/, text: 'Memberi label pada commit, biasanya untuk rilis (v1.2.0).' },
  { match: /^git reflog/, text: 'Riwayat perpindahan HEAD — penyelamat saat commit “hilang”.' },
  { match: /^git bisect/, text: 'Mencari commit yang menyebabkan bug dengan pencarian biner.' },
  { match: /^git blame/, text: 'Menampilkan commit dan penulis terakhir untuk setiap baris file.' },
  { match: /^git config/, text: 'Mengatur identitas dan preferensi Git (user.name, user.email, alias).' },
  { match: /^git rm/, text: 'Menghapus file dari working directory dan staging.' },
  { match: /^git mv/, text: 'Memindahkan atau mengganti nama file sekaligus mencatatnya di staging.' },
]

export default function ExplainCommand() {
  const [command, setCommand] = useState('')
  const [answer, setAnswer] = useState('')

  function explain(e) {
    e.preventDefault()
    const cmd = command.trim().toLowerCase()
    if (!cmd) return
    const hit = dictionary.find((entry) => entry.match.test(cmd))
    setAnswer(
      hit
        ? hit.text
        : 'Command ini belum ada di kamus simulasi. Coba command inti seperti add, commit, merge, rebase, reset, atau stash.',
    )
  }

  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-400">
        <BulbIcon className="h-3.5 w-3.5 text-amber-500" /> Explain this command
      </p>
      <form onSubmit={explain} className="mt-2 flex gap-2">
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="mis. git reset --hard HEAD~1"
          className="min-w-0 flex-1 rounded-lg border-0 bg-ink-50 px-2.5 py-1.5 font-mono text-[11px] text-ink-800 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 dark:bg-ink-800 dark:text-ink-100 dark:ring-ink-700"
          aria-label="Command yang ingin dijelaskan"
        />
        <Button type="submit" size="sm" variant="secondary">
          Jelaskan
        </Button>
      </form>
      {answer && <p className="mt-2 rounded-lg bg-brand-50 px-2.5 py-2 text-[11px] leading-relaxed text-brand-900 dark:bg-brand-900/20 dark:text-brand-200">{answer}</p>}
    </Card>
  )
}
