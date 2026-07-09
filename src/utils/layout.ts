import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { Circle } from '../types';

const NODE_W = 120;
const NODE_H = 80;
const CENTER_RADIUS = 220; // 环绕半径
const CENTER_RADIUS_SMALL = 160; // 节点少时更紧凑

/** 计算每个节点的度数（连接数） */
function computeDegrees(nodes: Node[], edges: Edge[]): Map<string, number> {
  const deg = new Map<string, number>();
  for (const n of nodes) deg.set(n.id, 0);
  for (const e of edges) {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
  }
  return deg;
}

/** 中心辐射布局：中心节点在中间，其他节点按角度均匀环绕 */
function radialLayout(
  nodes: Node[],
  centerId: string,
  edges: Edge[]
): Node[] {
  const centerNode = nodes.find((n) => n.id === centerId);
  if (!centerNode) return nodes;

  const others = nodes.filter((n) => n.id !== centerId);
  const count = others.length;
  if (count === 0) return nodes;

  const radius = count <= 8 ? CENTER_RADIUS_SMALL : CENTER_RADIUS;
  const startAngle = -Math.PI / 2; // 从顶部开始
  const angleStep = (2 * Math.PI) / count;

  // 把度数高的邻居优先放在上方（视觉更自然）
  const degrees = computeDegrees(nodes, edges);
  others.sort((a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0));

  const positioned = new Map<string, { x: number; y: number }>();
  positioned.set(centerId, { x: 0, y: 0 });

  others.forEach((node, i) => {
    const angle = startAngle + i * angleStep;
    positioned.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  return nodes.map((node) => {
    const pos = positioned.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: {
        x: pos.x - NODE_W / 2,
        y: pos.y - NODE_H / 2,
      },
    };
  });
}

/** 力导向布局：节点互相排斥，连线像弹簧，自然散开 */
function forceLayout(
  nodes: Node[],
  edges: Edge[],
  iterations = 300
): Node[] {
  if (nodes.length === 0) return nodes;

  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();

  // 初始化：随机分布在一个圆上，避免全部重叠
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1);
    const r = 200 + Math.random() * 100;
    positions.set(n.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r, vx: 0, vy: 0 });
  });

  const k = 200; // 理想弹簧长度
  const repulsion = 8000; // 排斥力强度
  const damping = 0.6; // 阻尼
  const centerGravity = 0.03; // 向中心轻微吸引，防止飘太远

  for (let iter = 0; iter < iterations; iter++) {
    // 计算排斥力（所有节点对之间）
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = positions.get(nodes[i].id)!;
        const b = positions.get(nodes[j].id)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // 计算弹簧力（边连接的节点之间）
    for (const edge of edges) {
      const a = positions.get(edge.source);
      const b = positions.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - k) * 0.02; // 弹簧系数
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // 向中心轻微吸引
    for (const n of nodes) {
      const p = positions.get(n.id)!;
      p.vx -= p.x * centerGravity;
      p.vy -= p.y * centerGravity;
    }

    // 应用速度和阻尼
    for (const n of nodes) {
      const p = positions.get(n.id)!;
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  return nodes.map((node) => {
    const pos = positions.get(node.id)!;
    return {
      ...node,
      position: {
        x: pos.x - NODE_W / 2,
        y: pos.y - NODE_H / 2,
      },
    };
  });
}

/** dagre 左右布局：适合有明显层级结构的复杂关系 */
function dagreLayoutLR(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: 100,
    ranksep: 180,
    marginx: 60,
    marginy: 60,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, { minlen: 1 });
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_W / 2,
        y: dagreNode.y - NODE_H / 2,
      },
    };
  });
}

/** 智能布局：根据图结构自动选择最佳布局算法 */
export function smartLayout(
  nodes: Node[],
  edges: Edge[],
  _circles: Circle[]
): Node[] {
  if (nodes.length <= 1) return nodes;

  const degrees = computeDegrees(nodes, edges);

  // 找出度数最高的节点（中心节点）
  let maxDeg = 0;
  let centerId = nodes[0].id;
  for (const [id, d] of degrees) {
    if (d > maxDeg) {
      maxDeg = d;
      centerId = id;
    }
  }

  const totalEdges = edges.length;

  // 策略选择
  if (nodes.length <= 12 && maxDeg >= nodes.length * 0.4) {
    // 一对多 / 星型结构：中心辐射（中心节点连接了 40% 以上节点）
    return radialLayout(nodes, centerId, edges);
  }

  if (nodes.length <= 20 && totalEdges <= nodes.length * 1.5) {
    // 稀疏图：力导向自然散开
    return forceLayout(nodes, edges);
  }

  // 复杂密集图：dagre 左右层级
  return dagreLayoutLR(nodes, edges);
}
