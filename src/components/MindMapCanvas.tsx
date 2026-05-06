import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useMindMapStore } from '@/stores/mindMapStore';
import { MindNode } from './MindNode';
import { getViewportBounds, isNodeInViewport, isConnectionInViewport } from '@/utils/viewport';
import type { MindNode as MindNodeType, LayoutType } from '@/types';

interface Connection {
  id: string;
  d: string;
}

export function MindMapCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const rafRef = useRef<number>(0);
  const pendingOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const {
    nodes,
    layout,
    scale,
    offsetX,
    offsetY,
    selectedNodeId,
    startDrag,
    setScale,
    setOffset,
    selectNode,
    fitToView,
  } = useMindMapStore();

  // 监听容器大小变化
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 自动适配视图：首次加载、resetView 或切换标签页后自动居中适配
  const didInitialFitRef = useRef(false);
  const prevViewportRef = useRef({ scale, offsetX, offsetY });

  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;

    const isDefault = scale === 1 && offsetX === 0 && offsetY === 0;
    let shouldFit = false;

    if (!didInitialFitRef.current && isDefault) {
      // 首次加载自动适配
      shouldFit = true;
      didInitialFitRef.current = true;
    } else if (didInitialFitRef.current) {
      const prev = prevViewportRef.current;
      const wasDefault = prev.scale === 1 && prev.offsetX === 0 && prev.offsetY === 0;
      if (!wasDefault && isDefault) {
        // resetView 或切换标签页后自动适配
        shouldFit = true;
      }
    }

    if (shouldFit) {
      fitToView(containerSize.width, containerSize.height);
    }

    prevViewportRef.current = { scale, offsetX, offsetY };
  }, [containerSize.width, containerSize.height, scale, offsetX, offsetY, fitToView]);

  // 计算视口边界
  const viewportBounds = useMemo(() => {
    if (containerSize.width === 0) return null;
    return getViewportBounds(
      containerSize.width,
      containerSize.height,
      offsetX,
      offsetY,
      scale
    );
  }, [containerSize, offsetX, offsetY, scale]);

  // 根据布局类型计算连线路径
  const getConnectionPath = useCallback((node: MindNodeType, child: MindNodeType, layoutType: LayoutType): string => {
    const halfW = node.width / 2;
    const halfH = node.height / 2;
    const childHalfW = child.width / 2;
    const childHalfH = child.height / 2;

    let startX: number, startY: number, endX: number, endY: number;
    let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

    switch (layoutType) {
      case 'mindmap-right':
      case 'logic-right':
        startX = node.x + halfW;
        startY = node.y;
        endX = child.x - childHalfW;
        endY = child.y;
        cp1x = startX + (endX - startX) * 0.5;
        cp1y = startY;
        cp2x = endX - (endX - startX) * 0.5;
        cp2y = endY;
        return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

      case 'mindmap-left':
      case 'logic-left':
        startX = node.x - halfW;
        startY = node.y;
        endX = child.x + childHalfW;
        endY = child.y;
        cp1x = startX + (endX - startX) * 0.5;
        cp1y = startY;
        cp2x = endX - (endX - startX) * 0.5;
        cp2y = endY;
        return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

      case 'mindmap-both':
        // 根据子节点相对位置判断方向
        if (child.x > node.x) {
          // 子节点在右侧
          startX = node.x + halfW;
          endX = child.x - childHalfW;
        } else {
          // 子节点在左侧
          startX = node.x - halfW;
          endX = child.x + childHalfW;
        }
        startY = node.y;
        endY = child.y;
        cp1x = startX + (endX - startX) * 0.5;
        cp1y = startY;
        cp2x = endX - (endX - startX) * 0.5;
        cp2y = endY;
        return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

      case 'org-down':
        startX = node.x;
        startY = node.y + halfH;
        endX = child.x;
        endY = child.y - childHalfH;
        cp1x = startX;
        cp1y = startY + (endY - startY) * 0.5;
        cp2x = endX;
        cp2y = endY - (endY - startY) * 0.5;
        return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

      case 'org-up':
        startX = node.x;
        startY = node.y - halfH;
        endX = child.x;
        endY = child.y + childHalfH;
        cp1x = startX;
        cp1y = startY + (endY - startY) * 0.5;
        cp2x = endX;
        cp2y = endY - (endY - startY) * 0.5;
        return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

      default:
        return '';
    }
  }, []);

  // RAF 优化的偏移更新
  const applyPendingOffset = useCallback(() => {
    if (pendingOffsetRef.current) {
      setOffset(pendingOffsetRef.current.x, pendingOffsetRef.current.y);
      pendingOffsetRef.current = null;
    }
  }, [setOffset]);

  // 滚轮缩放/平移
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setScale(scale + delta);
    } else {
      // 使用 RAF 批处理平移
      const current = pendingOffsetRef.current;
      const nextX = current ? current.x - e.deltaX : offsetX - e.deltaX;
      const nextY = current ? current.y - e.deltaY : offsetY - e.deltaY;
      pendingOffsetRef.current = { x: nextX, y: nextY };

      if (rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(() => {
          applyPendingOffset();
          rafRef.current = 0;
        });
      }
    }
  }, [scale, offsetX, offsetY, setScale, applyPendingOffset]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      startDrag(e.clientX, e.clientY);
    }
  }, [startDrag]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.role === 'canvas-bg') {
      selectNode(null);
    }
  }, [selectNode]);

  // 全局鼠标事件（拖拽）
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const state = useMindMapStore.getState();
      if (!state.isDragging) return;

      // 使用 RAF 优化拖拽
      const newX = state.offsetX + (e.clientX - state.dragStartX);
      const newY = state.offsetY + (e.clientY - state.dragStartY);

      pendingOffsetRef.current = { x: newX, y: newY };
      useMindMapStore.setState({
        dragStartX: e.clientX,
        dragStartY: e.clientY,
      });

      if (rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(() => {
          applyPendingOffset();
          rafRef.current = 0;
        });
      }
    };

    const handleGlobalMouseUp = () => {
      useMindMapStore.getState().endDrag();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [applyPendingOffset]);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useMindMapStore.getState();
      const { selectedNodeId, editingNodeId, addChild, addSibling, deleteNode, startEditing, nodes } = state;

      // 如果有节点在编辑中，不拦截（让输入框自己处理）
      if (editingNodeId) {
        // 只有 Escape 在输入框处理完后退出编辑，这里不拦截
        return;
      }

      if (!selectedNodeId) return;

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          addChild(selectedNodeId);
          break;
        case 'Enter':
          e.preventDefault();
          addSibling(selectedNodeId);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          // 根节点不能删除
          if (nodes[selectedNodeId]?.parentId !== null) {
            deleteNode(selectedNodeId);
          }
          break;
        case 'F2':
          e.preventDefault();
          startEditing(selectedNodeId);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      ref={canvasRef}
      data-canvas="mindmap"
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-gray-50"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onClick={handleCanvasClick}
    >
      {/* Grid background */}
      <div
        data-role="canvas-bg"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${offsetX}px ${offsetY}px`,
        }}
      />

      {/* 实时计算可见节点（不缓存，确保折叠状态立即生效） */}
      {(() => {
        const allNodes = Object.values(nodes);
        const visibleNodeList = allNodes.filter((node) => {
          let current = node;
          while (current.parentId) {
            const parent = nodes[current.parentId];
            if (!parent) break;
            if (parent.collapsed) return false;
            current = parent;
          }
          return true;
        }).filter(node => !viewportBounds || isNodeInViewport(node, viewportBounds));

        const visibleNodeIds = new Set(visibleNodeList.map(n => n.id));

        // 计算连线
        const connectionList: Connection[] = [];
        visibleNodeList.forEach(node => {
          if (node.collapsed) return;
          node.children.forEach(childId => {
            if (!visibleNodeIds.has(childId)) return;
            const child = nodes[childId];
            if (!child) return;
            if (viewportBounds && !isConnectionInViewport(node, child, viewportBounds)) return;
            const d = getConnectionPath(node, child, layout);
            if (d) {
              connectionList.push({ id: `${node.id}-${childId}`, d });
            }
          });
        });

        return (
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
          >
            <svg
              className="absolute top-0 left-0 overflow-visible"
              style={{ width: '100%', height: '100%' }}
            >
              {connectionList.map(conn => (
                <path
                  key={conn.id}
                  d={conn.d}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  className="transition-all duration-200"
                />
              ))}
            </svg>

            {visibleNodeList.map(node => (
              <MindNode
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
              />
            ))}

            {/* Viewport info */}
            <div className="absolute bottom-10 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm text-xs text-gray-500 border border-gray-200 pointer-events-none space-y-0.5">
              <div>{Math.round(scale * 100)}% | ({Math.round(-offsetX)}, {Math.round(-offsetY)})</div>
              <div className="text-gray-400">渲染: {visibleNodeList.length}/{allNodes.length} 节点</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
