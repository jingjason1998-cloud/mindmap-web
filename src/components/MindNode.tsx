import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { MindNode as MindNodeType } from '@/types';
import { useMindMapStore } from '@/stores/mindMapStore';
import { cn } from '@/utils/cn';
import { parseMarkdown, renderRichText } from '@/utils/richText.tsx';

interface MindNodeProps {
  node: MindNodeType;
  isSelected: boolean;
}

export function MindNode({ node, isSelected }: MindNodeProps) {
  const {
    selectNode,
    startEditing,
    editingNodeId,
    updateNodeText,
    toggleCollapse,
    nodes,
  } = useMindMapStore();

  // 主防御：layout 引擎已标记 _hidden
  if (node._hidden) {
    return null;
  }
  // 兜底：如果运行时数据不一致，再做一次祖先检查
  let current = node;
  while (current.parentId) {
    const parent = nodes[current.parentId];
    if (!parent) break;
    if (parent.collapsed) {
      return null;
    }
    current = parent;
  }

  const isEditing = editingNodeId === node.id;
  const inputRef = useRef<HTMLInputElement>(null);
  const [editText, setEditText] = useState(node.text);

  // 解析富文本
  const richTextSegments = useMemo(() => parseMarkdown(node.text), [node.text]);
  const hasRichContent = richTextSegments.some(s => s.type !== 'text');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    startEditing(node.id);
    setEditText(node.text);
  }, [node.id, node.text, startEditing]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    // 如果点击的是按钮（如折叠按钮），不触发选中/编辑
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    if (isSelected) {
      startEditing(node.id);
      setEditText(node.text);
    } else {
      selectNode(node.id);
    }
  }, [node.id, node.text, isSelected, isEditing, selectNode, startEditing]);

  const handleBlur = useCallback(() => {
    if (editText.trim()) {
      updateNodeText(node.id, editText.trim());
    } else {
      setEditText(node.text);
      startEditing(null);
    }
  }, [node.id, editText, node.text, updateNodeText, startEditing]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditText(node.text);
      startEditing(null);
    }
  }, [node.text, startEditing]);

  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCollapse(node.id);
  }, [node.id, toggleCollapse]);

  // 动态计算节点宽度（根据内容调整）
  const nodeWidth = useMemo(() => {
    if (hasRichContent) {
      return Math.max(160, node.width);
    }
    return node.width;
  }, [hasRichContent, node.width]);

  return (
    <div
      className="absolute"
      style={{
        left: node.x,
        top: node.y,
        width: nodeWidth,
        height: 'auto',
        minHeight: node.height,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className={cn(
          'relative flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg border-2 text-sm font-medium select-none transition-all duration-150 cursor-pointer',
          'bg-white border-gray-200 text-gray-800 shadow-sm hover:shadow-md hover:border-primary-300',
          isSelected && 'border-primary-500 shadow-md ring-2 ring-primary-100',
          node.parentId === null && 'bg-primary-50 border-primary-300 text-primary-800 font-bold',
          isEditing && 'ring-2 ring-primary-400',
          hasRichContent && 'min-h-[52px]'
        )}
        style={{
          width: nodeWidth,
          minHeight: node.height,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-center bg-transparent outline-none text-sm"
            style={{ minWidth: '60px' }}
            placeholder="支持 Markdown: **粗体** *斜体* `代码` [链接](url)"
          />
        ) : (
          <span className="max-w-[220px] break-words text-center leading-snug">
            {renderRichText(richTextSegments)}
          </span>
        )}

        {/* Collapse/Expand button */}
        {node.children.length > 0 && !isEditing && (
          <button
            onClick={handleToggleCollapse}
            className={cn(
              'absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border transition-colors z-10',
              node.collapsed
                ? 'bg-primary-500 border-primary-500 text-white hover:bg-primary-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-100'
            )}
          >
            {node.collapsed ? '+' : '-'}
          </button>
        )}
      </div>

      {/* 菜单已移除，全部操作通过键盘快捷键完成 */}
    </div>
  );
}
