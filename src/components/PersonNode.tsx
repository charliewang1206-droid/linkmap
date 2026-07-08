import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { generateAvatarDataUrl } from '../utils/avatar';
import type { Person } from '../types';

type PersonNodeData = {
  person: Person;
  isSelected: boolean;
  isFocused: boolean;
  focusMode: boolean;
};

function PersonNode({ data }: NodeProps) {
  const { person, isSelected, isFocused, focusMode } = data as unknown as PersonNodeData;

  const opacity = focusMode && !isFocused ? 0.15 : 1;

  return (
    <div
      className="flex flex-col items-center"
      style={{ opacity, transition: 'opacity 0.3s ease' }}
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

      {/* 底部 Handle（隐藏，用于连线） */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-0 !h-0 !border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-0 !h-0 !border-0 !bg-transparent"
      />
    </div>
  );
}

export default memo(PersonNode);
