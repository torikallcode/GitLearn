import { useCallback, useEffect, useState } from 'react'
import { createRepo, runCommand } from './engine'

export default function useSimulator(scenario = 'empty') {
  const [repo, setRepo] = useState(() => createRepo(scenario))
  const [lines, setLines] = useState(() => [
    { type: 'muted', text: `Sandbox siap (skenario: ${scenario}). Ketik "git status" atau "help".` },
  ])
  const [ranCommands, setRanCommands] = useState(0)
  const [history, setHistory] = useState([])

  useEffect(() => {
    setRepo(createRepo(scenario))
    setLines([{ type: 'muted', text: `Sandbox siap (skenario: ${scenario}). Ketik "git status" atau "help".` }])
    setRanCommands(0)
    setHistory([])
  }, [scenario])

  const reset = useCallback(() => {
    setRepo(createRepo(scenario))
    setLines([{ type: 'muted', text: 'Sandbox di-reset ke kondisi awal lesson.' }])
    setRanCommands(0)
    setHistory([])
  }, [scenario])

  const run = useCallback((input) => {
    const command = input.trim()
    if (!command) return
    setHistory((prev) => [...prev, { repo, lines, ranCommands }])
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
  }, [repo, lines, ranCommands])

  const undo = useCallback(() => {
    if (!history.length) return false
    const previous = history[history.length - 1]
    setRepo(previous.repo)
    setLines(previous.lines)
    setRanCommands(previous.ranCommands)
    setHistory(history.slice(0, -1))
    return true
  }, [history])

  return { repo, lines, run, reset, undo, canUndo: history.length > 0, ranCommands, setLines }
}
