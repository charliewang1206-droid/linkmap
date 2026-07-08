import { memo, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { Circle } from '../types';

type CircleNodeData = {
  circle: Circle;
  members: { id: string; position: { x: number; y: number } }[];
};

function CircleNode({ data }: NodeProps) {
  const { circle, members } = data as unknown as CircleNodeData;

  const boundingBox = useMemo(() => {
    if (members.length === 0) {
      return { x: 0, y: 0, width: 160, height: 80 };
    }

    const padding = 40;
    const labelHeight = 24;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const m of members) {
      // Person nodes are centered on their position (approx 60px wide, 80px tall)
      minX = Math.min(minX, m.position.x - 30);
      minY = Math.min(minY, m.position.y - 10);
      maxX = Math.max(maxX, m.position.x + 70);
      maxY = Math.max(maxY, m.position.y + 70);
    }

    return {
      x: minX - padding,
      y: minY - padding - labelHeight,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2 + labelHeight,
    };
  }, [members]);

  if (members.length === 0) return null;

  return (
    <div
      className="absolute rounded-2xl pointer-events-none"
      style={{
        left: boundingBox.x,
        top: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
        border: `2px dashed ${circle.color}`,
        backgroundColor: `${circle.color}06`,
      }}
    >
      {/* Circle label */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
        style={{
          backgroundColor: circle.color,
          color: '#fff',
          boxShadow: `0 2px 4px ${circle.color}40`,
        }}
      >
        {circle.name}
        <span className="ml-1 opacity-80">{members.length}人</span>
      </div>
    </div>
  );
}

export default memo(CircleNode);
