// Deterministic graph layout for the commit visualizer.
import { headId, reachableCommits, shortId } from './state.js';

export const LANE_WIDTH = 160;
export const ROW_HEIGHT = 72;

export const LANE_COLORS = [
  '#f97316',
  '#3b82f6',
  '#22c55e',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#eab308',
  '#ec4899',
];

export function graphLayout(state) {
  const commits = reachableCommits(state);
  if (!commits.length) {
    return { lanes: [], nodes: [], edges: [], width: 0, height: 0 };
  }

  const branchNames = Object.keys(state.branches || {});
  const orderedBranches = branchNames.includes('main')
    ? ['main', ...branchNames.filter((name) => name !== 'main').sort()]
    : [...branchNames].sort();

  const laneNames = [...orderedBranches];
  if (!laneNames.length) laneNames.push('HEAD');
  const laneIndex = new Map(laneNames.map((name, index) => [name, index]));
  const commitLane = new Map();

  const assign = (startId, lane) => {
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop();
      if (!id || !state.commits[id] || commitLane.has(id)) continue;
      commitLane.set(id, lane);
      for (const parent of state.commits[id].parents || []) stack.push(parent);
    }
  };

  for (const name of orderedBranches) assign(state.branches[name], name);
  assign(headId(state), laneNames[0]);
  for (const id of Object.values(state.tags || {})) assign(id, laneNames[0]);

  const nodes = commits.map((id, index) => {
    const commit = state.commits[id];
    const lane = commitLane.get(id) || laneNames[0];
    const laneIdx = laneIndex.get(lane) ?? 0;
    return {
      id,
      shortId: shortId(id),
      message: commit.message,
      x: laneIdx * LANE_WIDTH,
      y: index * ROW_HEIGHT,
      lane,
      laneIndex: laneIdx,
      branches: Object.keys(state.branches || {})
        .filter((name) => state.branches[name] === id)
        .sort(),
      tags: Object.keys(state.tags || {})
        .filter((name) => state.tags[name] === id)
        .sort(),
      isHead: id === headId(state),
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const lanes = laneNames.map((name) => {
    const tipId = name === 'HEAD' ? headId(state) : state.branches[name];
    const tip = nodeById.get(tipId);
    return {
      name,
      color: LANE_COLORS[(laneIndex.get(name) || 0) % LANE_COLORS.length],
      y: tip ? tip.y : 0,
    };
  });

  const laneColor = (lane) => {
    const index = laneIndex.get(lane) ?? 0;
    return LANE_COLORS[index % LANE_COLORS.length];
  };

  const edges = [];
  for (const node of nodes) {
    const commit = state.commits[node.id];
    for (const parent of commit.parents || []) {
      const parentNode = nodeById.get(parent);
      if (!parentNode) continue;
      edges.push({
        from: node.id,
        to: parent,
        color: laneColor(parentNode.lane),
      });
    }
  }

  return {
    lanes,
    nodes,
    edges,
    width: laneNames.length * LANE_WIDTH,
    height: nodes.length * ROW_HEIGHT,
  };
}
