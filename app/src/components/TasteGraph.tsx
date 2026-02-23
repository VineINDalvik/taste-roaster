"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface GraphNode {
  id: string;
  label: string;
  type: "book" | "movie" | "music" | "keyword" | "genre" | "person";
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface TasteGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const TYPE_COLORS: Record<string, string> = {
  book: "#4fc3f7",
  movie: "#e94560",
  music: "#66bb6a",
  keyword: "#ffa726",
  genre: "#ab47bc",
  person: "#ef5350",
};

const TYPE_LABELS: Record<string, string> = {
  book: "书",
  movie: "影",
  music: "音",
  keyword: "关键词",
  genre: "类型",
  person: "人物",
};

export default function TasteGraph({ nodes: initialNodes, edges }: TasteGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ nodeId: string | null; offsetX: number; offsetY: number }>({
    nodeId: null,
    offsetX: 0,
    offsetY: 0,
  });
  const hoverRef = useRef<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  const edgeMap = useRef(new Map<string, Set<string>>());

  useEffect(() => {
    edgeMap.current.clear();
    for (const e of edges) {
      if (!edgeMap.current.has(e.source)) edgeMap.current.set(e.source, new Set());
      if (!edgeMap.current.has(e.target)) edgeMap.current.set(e.target, new Set());
      edgeMap.current.get(e.source)!.add(e.target);
      edgeMap.current.get(e.target)!.add(e.source);
    }
  }, [edges]);

  useEffect(() => {
    nodesRef.current = initialNodes.map((n, i) => ({
      ...n,
      x: 200 + Math.cos((i / initialNodes.length) * Math.PI * 2) * 120 + Math.random() * 40,
      y: 200 + Math.sin((i / initialNodes.length) * Math.PI * 2) * 120 + Math.random() * 40,
      vx: 0,
      vy: 0,
    }));
  }, [initialNodes]);

  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // Force simulation
    for (let iter = 0; iter < 2; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction along edges
      const nodeById = new Map(nodes.map((n) => [n.id, n]));
      for (const edge of edges) {
        const a = nodeById.get(edge.source);
        const b = nodeById.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist - 80) * 0.005 * edge.weight;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx += (cx - node.x) * 0.001;
        node.vy += (cy - node.y) * 0.001;
      }

      // Apply velocity with damping
      for (const node of nodes) {
        if (dragRef.current.nodeId === node.id) continue;
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(20, Math.min(W - 20, node.x));
        node.y = Math.max(20, Math.min(H - 20, node.y));
      }
    }

    // Draw
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    const hoverId = hoverRef.current;
    const hoverConnected = hoverId ? edgeMap.current.get(hoverId) : null;

    // Draw edges
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      const a = nodeById.get(edge.source);
      const b = nodeById.get(edge.target);
      if (!a || !b) continue;

      const isHighlighted =
        hoverId && (edge.source === hoverId || edge.target === hoverId);
      const isDimmed = hoverId && !isHighlighted;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isHighlighted
        ? "rgba(233, 69, 96, 0.6)"
        : isDimmed
          ? "rgba(255, 255, 255, 0.03)"
          : `rgba(255, 255, 255, ${0.05 + edge.weight * 0.05})`;
      ctx.lineWidth = isHighlighted ? 1.5 : 0.5;
      ctx.stroke();
    }

    // Draw nodes
    for (const node of nodes) {
      const isHovered = node.id === hoverId;
      const isConnected = hoverConnected?.has(node.id);
      const isDimmed = hoverId && !isHovered && !isConnected;

      const color = TYPE_COLORS[node.type] || "#888";
      const radius = node.size * (isHovered ? 1.5 : 1);

      // Glow for hovered
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          node.x, node.y, radius,
          node.x, node.y, radius + 8
        );
        gradient.addColorStop(0, color + "40");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isDimmed ? color + "20" : color + (isHovered ? "ff" : "cc");
      ctx.fill();

      // Label
      if (radius >= 4 || isHovered || isConnected) {
        ctx.font = `${isHovered ? "bold " : ""}${Math.max(9, radius * 1.5)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = isDimmed ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)";
        ctx.fillText(
          node.label.length > 8 ? node.label.slice(0, 7) + "…" : node.label,
          node.x,
          node.y + radius + 12
        );
      }
    }

    animRef.current = requestAnimationFrame(simulate);
  }, [edges]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [simulate]);

  // Mouse interaction
  const getNodeAt = useCallback((x: number, y: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const dx = nodes[i].x - x;
      const dy = nodes[i].y - y;
      if (dx * dx + dy * dy < (nodes[i].size + 5) ** 2) return nodes[i];
    }
    return null;
  }, []);

  const getCanvasPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * canvas.width,
        y: ((clientY - rect.top) / rect.height) * canvas.height,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      const node = getNodeAt(x, y);
      if (node) {
        dragRef.current = {
          nodeId: node.id,
          offsetX: x - node.x,
          offsetY: y - node.y,
        };
      }
    },
    [getCanvasPos, getNodeAt]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      if (dragRef.current.nodeId) {
        const node = nodesRef.current.find((n) => n.id === dragRef.current.nodeId);
        if (node) {
          node.x = x - dragRef.current.offsetX;
          node.y = y - dragRef.current.offsetY;
          node.vx = 0;
          node.vy = 0;
        }
      } else {
        const node = getNodeAt(x, y);
        const newId = node?.id ?? null;
        if (newId !== hoverRef.current) {
          hoverRef.current = newId;
          setHoveredNode(node);
        }
      }
    },
    [getCanvasPos, getNodeAt]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current.nodeId = null;
  }, []);

  return (
    <div className="card-glass rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#e94560]">🌐 品味星图</h3>
        <div className="flex gap-2">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <span
              key={type}
              className="flex items-center gap-1 text-[10px] text-gray-500"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: TYPE_COLORS[type] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden bg-[#0a0a1a]">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full cursor-grab active:cursor-grabbing"
          style={{ aspectRatio: "1/1" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
        />
        {hoveredNode && (
          <div className="absolute bottom-2 left-2 right-2 p-2 rounded-lg bg-black/80 text-xs text-gray-300">
            <span style={{ color: TYPE_COLORS[hoveredNode.type] }}>
              [{TYPE_LABELS[hoveredNode.type]}]
            </span>{" "}
            {hoveredNode.label}
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-600 text-center">
        拖拽节点探索 · 悬停查看详情
      </p>
    </div>
  );
}
