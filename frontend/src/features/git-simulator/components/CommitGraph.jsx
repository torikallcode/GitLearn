import { useMemo } from 'react'
import { graphLayout } from '../engine'
import { BranchIcon } from '../../../components/icons'

const FALLBACK = ['#3b66f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

export default function CommitGraph({ repo }) {
  const graph = useMemo(() => {
    try {
      return graphLayout(repo)
    } catch {
      return { lanes: [], nodes: [], edges: [], width: 0, height: 0 }
    }
  }, [repo])

  if (!graph.nodes.length) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50 text-center dark:border-ink-700 dark:bg-ink-900/50">
        <BranchIcon className="h-6 w-6 text-ink-300 dark:text-ink-600" />
        <p className="text-xs text-ink-400">Belum ada commit. Graph muncul setelah commit pertama.</p>
      </div>
    )
  }

  const padX = 18
  const padTop = 22
  const width = Math.max(graph.width + padX * 2, 220)
  const height = Math.max(graph.height + padTop + 18, 120)

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-950">
      <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2 dark:border-ink-800">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-600 dark:text-ink-300">
          <BranchIcon className="h-3.5 w-3.5" /> Commit graph
        </span>
        <span className="font-mono text-[10px] text-ink-400">HEAD → {repo.HEAD?.ref || '—'}</span>
      </div>
      <div className="max-h-72 overflow-auto p-2 scrollbar-thin">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="mx-auto"
          role="img"
          aria-label={`Grafik commit dengan ${graph.nodes.length} commit dan ${graph.lanes.length} branch`}
        >
          {graph.lanes.map((lane, i) => (
            <g key={lane.name}>
              <rect
                x={padX + (lane.x ?? i * 160) - 6}
                y={4}
                width={Math.max(54, lane.name.length * 6.2 + 12)}
                height={14}
                rx={7}
                fill={(lane.color || FALLBACK[i % FALLBACK.length]) + '22'}
              />
              <text
                x={padX + (lane.x ?? i * 160)}
                y={14}
                fontSize="8.5"
                fontFamily="monospace"
                fill={lane.color || FALLBACK[i % FALLBACK.length]}
              >
                {lane.name}
              </text>
            </g>
          ))}

          {graph.edges.map((edge, i) => {
            const from = graph.nodes.find((n) => n.id === edge.from)
            const to = graph.nodes.find((n) => n.id === edge.to)
            if (!from || !to) return null
            const x1 = from.x + padX + 6
            const y1 = from.y + padTop + 6
            const x2 = to.x + padX + 6
            const y2 = to.y + padTop + 6
            const midY = (y1 + y2) / 2
            return (
              <path
                key={i}
                d={x1 === x2 ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke={edge.color || FALLBACK[0]}
                strokeWidth="2"
                opacity="0.65"
              />
            )
          })}

          {graph.nodes.map((node) => {
            const color = node.branches.length
              ? graph.lanes.find((l) => l.name === node.branches[0])?.color || FALLBACK[0]
              : FALLBACK[0]
            return (
              <g key={node.id}>
                {node.isHead && (
                  <circle
                    cx={node.x + padX + 6}
                    cy={node.y + padTop + 6}
                    r={10}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                    opacity="0.8"
                  />
                )}
                <circle
                  cx={node.x + padX + 6}
                  cy={node.y + padTop + 6}
                  r={node.isHead ? 6 : 5}
                  fill={node.isHead ? color : '#fff'}
                  stroke={color}
                  strokeWidth="2"
                >
                  <title>{`${node.shortId} — ${node.message}`}</title>
                </circle>
                <text
                  x={node.x + padX + 18}
                  y={node.y + padTop + 4}
                  fontSize="9"
                  fontFamily="monospace"
                  fill="currentColor"
                  className="fill-ink-700 dark:fill-ink-200"
                >
                  {node.message.length > 32 ? `${node.message.slice(0, 31)}…` : node.message}
                </text>
                <text
                  x={node.x + padX + 18}
                  y={node.y + padTop + 14}
                  fontSize="7.5"
                  fontFamily="monospace"
                  className="fill-ink-400"
                >
                  {node.shortId}
                  {node.branches.length ? ` · ${node.branches.join(', ')}` : ''}
                  {node.isHead ? ' · HEAD' : ''}
                  {node.tags?.length ? ` · 🏷 ${node.tags.join(', ')}` : ''}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-ink-100 px-3 py-1.5 text-[10px] text-ink-400 dark:border-ink-800">
        <span>{graph.nodes.length} commit</span>
        <span>{graph.lanes.length} branch</span>
        <span>{repo.remotes && Object.keys(repo.remotes).length ? `${Object.keys(repo.remotes).length} remote` : 'lokal'}</span>
      </div>
    </div>
  )
}
