import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { generateAvatarDataUrl } from '../utils/avatar';
import type { Person } from '../types';

type PersonNodeData = {
  person: Person;
  isSelected: boolean;
  isFocused: boolean;
  focusMode: boolean;
};

const HANDLE_POSITIONS = [
  { type: 'source' as const, pos: Position.Top, id: 'source-top' },
  { type: 'source' as const, pos: Position.Bottom, id: 'source-bottom' },
  { type: 'source' as const, pos: Position.Left, id: 'source-left' },
  { type: 'source' as const, pos: Position.Right, id: 'source-right' },
  { type: 'target' as const, pos: Position.Top, id: 'target-top' },
  { type: 'target' as const, pos: Position.Bottom, id: 'target-bottom' },
  { type: 'target' as const, pos: Position.Left, id: 'target-left' },
  { type: 'target' as const, pos: Position.Right, id: 'target-right' },
];

function PersonNode({ data }: NodeProps) {
  const { person, isSelected, isFocused, focusMode } = data as unknown as PersonNodeData;
  const [isHovered, setIsHovered] = useState(false);

  const opacity = focusMode && !isFocused ? 0.15 : 1;

  return (
    <div
      className="flex flex-col items-center group"
      style={{ opacity, transition: 'opacity 0.3s ease' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 头像 */}
      <div
        className={`w-12 h-12 rounded-full overflow-hidden shrink-0 transition-all duration-200 ${
          isSelected
            ? 'ring-2 ring-blue-500 ring-offset-2 shadow-md'
            : isFocused
              ? 'ring-2 ring-blue-400 ring-offset-2'
              : 'shadow-sm'
        }`}
      >
        {person.avatar ? (
          <img
            src={person.avatar}
            alt={person.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={generateAvatarDataUrl(person.name)}
            alt={person.name}
            className="w-full h-full"
          />
        )}
      </div>

      {/* 名字 */}
      <p
        className={`mt-1 text-xs text-center font-medium max-w-[80px] truncate ${
          isSelected ? 'text-blue-700' : 'text-gray-700'
        }`}
      >
        {person.name}
      </p>

      {/* 四向 Handle - hover 或选中时可见 */}
      {HANDLE_POSITIONS.map(({ type, pos, id }) => {
        const isSource = type === 'source';
        return (
          <Handle
            key={id}
            type={type}
            position={pos}
            id={id}
            className={`
              !w-2.5 !h-2.5 !border-2 !border-white
              transition-all duration-200
              ${isSource ? '!bg-blue-500 hover:!bg-blue-600' : '!bg-green-500 hover:!bg-green-600'}
              ${isHovered || isSelected
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-50'}
              hover:!w-3.5 hover:!h-3.5
            `}
            style={{
              borderRadius: '50%',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
            }}
          />
        );
      })}
    </div>
  );
}

export default memo(PersonNode);
