import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Circle } from '../types';

export function dagreLayout(
  nodes: Node[],
  edges: Edge[],
  circles: Circle[],
  direction: 'TB' | 'LR' = 'TB'
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  // Build circle member adjacency for grouping
  const circleAdj = new Map<string, Set<string>>();
  for (const circle of circles) {
    const members = circle.personIds;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (!circleAdj.has(members[i])) circleAdj.set(members[i], new Set());
        if (!circleAdj.has(members[j])) circleAdj.set(members[j], new Set());
        circleAdj.get(members[i])!.add(members[j]);
        circleAdj.get(members[j])!.add(members[i]);
      }
    }
  }

  // Add nodes
  for (const node of nodes) {
    g.setNode(node.id, { width: 120, height: 80 });
  }

  // Add real edges
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, { minlen: 1 });
  }

  // Add virtual circle edges (higher weight, closer distance)
  for (const [src, targets] of circleAdj) {
    for (const tgt of targets) {
      // Only add if both nodes exist in the graph
      if (nodes.some(n => n.id === src) && nodes.some(n => n.id === tgt)) {
        g.setEdge(src, tgt, { minlen: 0.5, weight: 3 });
      }
    }
  }

  dagre.layout(g);

  return nodes.map(node => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;
    return {
      ...node,
      position: {
        x: dagreNode.x - 60,
        y: dagreNode.y - 40,
      },
    };
  });
}
