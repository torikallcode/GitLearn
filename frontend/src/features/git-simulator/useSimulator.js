import { useCallback, useEffect, useState } from 'react'
import { createRepo, runCommand } from './engine'

export default function useSimulator(scenario = 'empty') {
  const [repo, setRepo] = useState(() => createRepo(scenario))
  const [lines, setLines] = useState(() => [
    { type: 'muted', text: `Sandbox siap (skenario: ${scenario}). Ketik "git status" atau "help".` },
  ])
  const [ranCommands, setRanCommands] = useState(0)

  useEffect(() => {
    setRepo(createRepo(scenario))
    setLines([{ type: 'muted', text: `Sandbox siap (skenario: ${scenario}). Ketik "git status" atau "help".` }])
    setRanCommands(0)
  }, [scenario])

  const reset = useCallback(() => {
    setRepo(createRepo(scenario))
    setLines([{ type: 'muted', text: 'Sandbox di-reset ke kondisi awal lesson.' }])
    setRanCommands(0)
  }, [scenario])

  const run = useCallback((input) => {
    const command = input.trim()
    if (!command) return
    const result = runCommand(repo, command)
    if (result.clear) {
      setLines([])
    } else {
      setLines((prev) => [
        ...prev,
        { type: 'cmd', text: command },
        ...result.output.map((text) => ({ type: result.error ? 'error' : 'out', text })),
      ])
    }
    setRepo(result.state)
    setRanCommands((n) => n + 1)
    return result
  }, [repo])

  return { repo, lines, run, reset, ranCommands, setLines }
}
