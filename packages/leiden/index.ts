export type Adjacency = Map<string, Map<string, number>>;

function getMap<K, V>(map: Map<K, V>, key: K, fallback: V): V {
  return map.get(key) ?? fallback;
}

function totalWeight(adj: Adjacency): number {
  let sum = 0;
  for (const neighbors of adj.values()) {
    for (const w of neighbors.values()) sum += w;
  }
  return sum / 2;
}

function nodeDegree(adj: Adjacency, node: string): number {
  let deg = 0;
  const neighbors = adj.get(node);
  if (!neighbors) return 0;
  for (const w of neighbors.values()) deg += w;
  return deg;
}

/**
 * Leiden community detection via iterative modularity optimization.
 *
 * Pure JS implementation operating on a weighted undirected adjacency list.
 * Uses Louvain-style local moving with a resolution parameter and graph
 * aggregation for multi-level refinement.
 *
 * @param adjacency - nodeId -> (neighborId -> weight)
 * @param resolution - Higher values yield more/smaller communities (default 1.0)
 * @returns nodeId -> communityId
 */
export function leiden(
  adjacency: Adjacency,
  resolution = 1.0,
): Map<string, number> {
  const originalNodes = Array.from(adjacency.keys());
  if (originalNodes.length === 0) return new Map();

  let currentAdj = adjacency;
  let nodeMembers = new Map<string, Set<string>>();
  for (const n of originalNodes) nodeMembers.set(n, new Set([n]));

  while (true) {
    const { assignment, moved } = localMoving(currentAdj, resolution);
    if (!moved) break;

    const { adj: coarseAdj, members: coarseMembers } = aggregate(
      currentAdj,
      assignment,
      nodeMembers,
    );

    if (coarseAdj.size >= currentAdj.size) break;
    currentAdj = coarseAdj;
    nodeMembers = coarseMembers;
  }

  const communityIndex = new Map<string, number>();
  let nextId = 0;
  const result = new Map<string, number>();

  for (const [, members] of nodeMembers) {
    let cid: number | undefined;
    for (const orig of members) {
      if (cid === undefined) {
        if (!communityIndex.has(orig)) communityIndex.set(orig, nextId++);
        cid = communityIndex.get(orig) ?? nextId++;
      }
      result.set(orig, cid);
    }
  }

  return result;
}

function localMoving(
  adj: Adjacency,
  resolution: number,
): { assignment: Map<string, string>; moved: boolean } {
  const nodes = Array.from(adj.keys());
  const community = new Map<string, string>();
  for (const n of nodes) community.set(n, n);

  const m2 = totalWeight(adj) * 2 || 1;

  const strength = new Map<string, number>();
  for (const n of nodes) strength.set(n, nodeDegree(adj, n));

  const communityStrength = new Map<string, number>();
  for (const n of nodes) communityStrength.set(n, getMap(strength, n, 0));

  let anyMoved = false;
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = nodes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const ni = nodes[i]!;
      const nj = nodes[j]!;
      nodes[i] = nj;
      nodes[j] = ni;
    }

    for (const node of nodes) {
      const currentCom = getMap(community, node, node);
      const ki = getMap(strength, node, 0);
      const neighbors = adj.get(node);
      if (!neighbors || neighbors.size === 0) continue;

      const communityWeights = new Map<string, number>();
      for (const [neighbor, w] of neighbors) {
        const nc = getMap(community, neighbor, neighbor);
        communityWeights.set(nc, (communityWeights.get(nc) ?? 0) + w);
      }

      const sigmaCurrentWithout = getMap(communityStrength, currentCom, 0) - ki;
      const weightToCurrent = communityWeights.get(currentCom) ?? 0;

      let bestCom = currentCom;
      let bestGain = 0;

      for (const [candidateCom, weightToCandidate] of communityWeights) {
        if (candidateCom === currentCom) continue;
        const sigmaCandidate = getMap(communityStrength, candidateCom, 0);
        const gain =
          weightToCandidate -
          weightToCurrent -
          (resolution * ki * (sigmaCandidate - sigmaCurrentWithout)) / m2;
        if (gain > bestGain) {
          bestGain = gain;
          bestCom = candidateCom;
        }
      }

      if (bestCom !== currentCom) {
        community.set(node, bestCom);
        communityStrength.set(
          currentCom,
          getMap(communityStrength, currentCom, 0) - ki,
        );
        communityStrength.set(
          bestCom,
          getMap(communityStrength, bestCom, 0) + ki,
        );
        improved = true;
        anyMoved = true;
      }
    }
  }

  return { assignment: community, moved: anyMoved };
}

function aggregate(
  adj: Adjacency,
  assignment: Map<string, string>,
  nodeMembers: Map<string, Set<string>>,
): { adj: Adjacency; members: Map<string, Set<string>> } {
  const communities = new Map<string, Set<string>>();
  for (const [node, com] of assignment) {
    let set = communities.get(com);
    if (!set) {
      set = new Set();
      communities.set(com, set);
    }
    set.add(node);
  }

  const coarseAdj: Adjacency = new Map();
  const coarseMembers = new Map<string, Set<string>>();

  for (const [comId, comNodes] of communities) {
    coarseAdj.set(comId, new Map());
    const members = new Set<string>();
    for (const n of comNodes) {
      for (const orig of nodeMembers.get(n) ?? []) members.add(orig);
    }
    coarseMembers.set(comId, members);
  }

  for (const [node, neighbors] of adj) {
    const fromCom = getMap(assignment, node, node);
    const fromNeighbors = coarseAdj.get(fromCom) ?? new Map();
    if (!coarseAdj.has(fromCom)) coarseAdj.set(fromCom, fromNeighbors);
    for (const [neighbor, weight] of neighbors) {
      const toCom = getMap(assignment, neighbor, neighbor);
      if (fromCom === toCom) continue;
      fromNeighbors.set(toCom, (fromNeighbors.get(toCom) ?? 0) + weight);
    }
  }

  return { adj: coarseAdj, members: coarseMembers };
}