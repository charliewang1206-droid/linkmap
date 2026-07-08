import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePersonStore } from '../stores/usePersonStore';
import { useRelationStore } from '../stores/useRelationStore';
import { useUIStore } from '../stores/useUIStore';
import { useViewStore } from '../stores/useViewStore';
import { PRESET_RELATION_TYPES } from '../types';
import PersonNode from './PersonNode';
import EmptyState from './EmptyState';
import AddPersonModal from './AddPersonModal';

const nodeTypes = { personNode: PersonNode };

export default function GraphCanvas() {
  const persons = usePersonStore((s) => s.persons);
  const relations = useRelationStore((s) => s.relations);
  const addRelation = useRelationStore((s) => s.addRelation);
  const updatePerson = usePersonStore((s) => s.updatePerson);
  const selectedPersonId = useUIStore((s) => s.selectedPersonId);
  const setSelectedPerson = useUIStore((s) => s.setSelectedPerson);
  const focusedPersonId = useUIStore((s) => s.focusedPersonId);
  const setFocusedPerson = useUIStore((s) => s.setFocusedPerson);
  const currentViewId = useViewStore((s) => s.currentViewId);

  const [showAddModal, setShowAddModal] = useState(false);

  // 监听全局"添加人物"事件（来自 TopNav 移动端按钮）
  useEffect(() => {
    const handleOpenAddModal = () => setShowAddModal(true);
    window.addEventListener('linkmap:openAddModal', handleOpenAddModal);
    return () => window.removeEventListener('linkmap:openAddModal', handleOpenAddModal);
  }, []);

  // 连接中关系类型选择弹窗
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string;
    targetId: string;
    position: { x: number; y: number };
  } | null>(null);

  // 当前 View 中的人物
  const viewPersons = useMemo(
    () => persons.filter((p) => p.viewIds.includes(currentViewId)),
    [persons, currentViewId]
  );

  const viewPersonIds = useMemo(
    () => new Set(viewPersons.map((p) => p.id)),
    [viewPersons]
  );

  // 当前 View 相关的关系
  const viewRelations = useMemo(
    () =>
      relations.filter(
        (r) => viewPersonIds.has(r.sourceId) && viewPersonIds.has(r.targetId)
      ),
    [relations, viewPersonIds]
  );

  // 构建 ReactFlow nodes
  const initialNodes: Node[] = useMemo(
    () =>
      viewPersons.map((person) => ({
        id: person.id,
        type: 'personNode',
        position: person.position || { x: Math.random() * 400, y: Math.random() * 300 },
        data: {
          person,
          isSelected: person.id === selectedPersonId,
          isFocused: focusedPersonId ? person.id === focusedPersonId : false,
          focusMode: !!focusedPersonId,
        },
      })),
    [viewPersons, selectedPersonId, focusedPersonId]
  );

  // 构建 ReactFlow edges
  const initialEdges: Edge[] = useMemo(
    () =>
      viewRelations.map((rel) => ({
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        label: rel.type,
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
        labelStyle: { fill: '#64748b', fontWeight: 500, fontSize: 11 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
      })),
    [viewRelations]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 同步 nodes/edges 数据
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // 连接处理
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      // 检查是否已存在关系
      const exists = relations.some(
        (r) =>
          (r.sourceId === connection.source && r.targetId === connection.target) ||
          (r.sourceId === connection.target && r.targetId === connection.source)
      );
      if (exists) return;

      // 计算弹窗位置（连线中点）
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const midX =
        sourceNode && targetNode
          ? (sourceNode.position.x + targetNode.position.x) / 2
          : 300;
      const midY =
        sourceNode && targetNode
          ? (sourceNode.position.y + targetNode.position.y) / 2
          : 200;

      setPendingConnection({
        sourceId: connection.source,
        targetId: connection.target,
        position: { x: midX, y: midY },
      });
    },
    [relations, nodes]
  );

  // 选择关系类型
  const handleSelectRelationType = useCallback(
    async (type: string) => {
      if (!pendingConnection) return;
      await addRelation(pendingConnection.sourceId, pendingConnection.targetId, type);
      setPendingConnection(null);
    },
    [pendingConnection, addRelation]
  );

  // 节点点击
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedPerson(node.id);
    },
    [setSelectedPerson]
  );

  // 节点双击 - 聚焦
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setFocusedPerson(node.id);
    },
    [setFocusedPerson]
  );

  // 空白处点击 - 取消选中和聚焦
  const onPaneClick = useCallback(() => {
    setSelectedPerson(null);
    setFocusedPerson(null);
  }, [setSelectedPerson, setFocusedPerson]);

  // 节点拖拽结束 - 更新位置
  const onNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      updatePerson(node.id, { position: node.position });
    },
    [updatePerson]
  );

  // 自动布局
  const handleAutoLayout = useCallback(() => {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const spacing = 150;
    const updated = nodes.map((node, i) => ({
      ...node,
      position: {
        x: (i % cols) * spacing + 50,
        y: Math.floor(i / cols) * spacing + 50,
      },
    }));
    setNodes(updated);
    // 持久化位置
    updated.forEach((node) => {
      updatePerson(node.id, { position: node.position });
    });
  }, [nodes, setNodes, updatePerson]);

  // 添加人物
  const handleOpenAddModal = useCallback(() => {
    setShowAddModal(true);
  }, []);

  if (viewPersons.length === 0) {
    return (
      <>
        <div className="h-full flex items-center justify-center">
          <EmptyState onAddPerson={handleOpenAddModal} />
        </div>
        {showAddModal && <AddPersonModal onClose={() => setShowAddModal(false)} />}
      </>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
        }}
        deleteKeyCode={null}
        multiSelectionKeyCode={null}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e2e8f0"
        />
        <Controls
          className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
          position="bottom-right"
        />
        <MiniMap
          className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
          nodeColor={(n: Node) => {
            const data = n.data as { person?: { avatar?: string } } | undefined;
            return data?.person?.avatar ? '#2563EB' : '#94a3b8';
          }}
          maskColor="rgba(0,0,0,0.05)"
          position="bottom-left"
        />
      </ReactFlow>

      {/* 自动布局按钮 */}
      <button
        onClick={handleAutoLayout}
        className="absolute top-3 right-3 z-10 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all duration-200"
      >
        自动布局
      </button>

      {/* 添加人物按钮 - 更醒目的样式 */}
      <button
        onClick={handleOpenAddModal}
        className="absolute top-3 right-24 z-10 px-3.5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
        </svg>
        添加人物
      </button>

      {/* 添加人物弹窗 */}
      {showAddModal && <AddPersonModal onClose={() => setShowAddModal(false)} />}

      {/* 聚焦模式提示 */}
      {focusedPersonId && (
        <button
          onClick={() => setFocusedPerson(null)}
          className="absolute top-3 left-3 z-10 px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg shadow-sm text-blue-600 hover:bg-blue-50 transition-all duration-200"
        >
          退出聚焦模式
        </button>
      )}

      {/* 关系类型选择弹窗 */}
      {pendingConnection && (
        <div className="absolute inset-0 z-50" onClick={() => setPendingConnection(null)}>
          <div
            className="absolute bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[180px]"
            style={{
              left: pendingConnection.position.x,
              top: pendingConnection.position.y,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-gray-400 mb-2">选择关系类型</p>
            <div className="space-y-1">
              {PRESET_RELATION_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleSelectRelationType(type)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200"
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <input
                type="text"
                placeholder="自定义关系..."
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    handleSelectRelationType(e.currentTarget.value.trim());
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
