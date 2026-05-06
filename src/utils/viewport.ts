import type { MindNode } from '@/types';

const BUFFER = 200; // 缓冲区像素（世界坐标）

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * 计算当前视口在世界坐标系中的边界
 */
export function getViewportBounds(
  containerWidth: number,
  containerHeight: number,
  offsetX: number,
  offsetY: number,
  scale: number
): ViewportBounds {
  const minX = (-offsetX / scale) - BUFFER;
  const maxX = ((-offsetX + containerWidth) / scale) + BUFFER;
  const minY = (-offsetY / scale) - BUFFER;
  const maxY = ((-offsetY + containerHeight) / scale) + BUFFER;

  return { minX, maxX, minY, maxY };
}

/**
 * 判断节点是否在视口范围内
 */
export function isNodeInViewport(
  node: MindNode,
  bounds: ViewportBounds
): boolean {
  const halfW = node.width / 2;
  const halfH = node.height / 2;
  return (
    node.x + halfW >= bounds.minX &&
    node.x - halfW <= bounds.maxX &&
    node.y + halfH >= bounds.minY &&
    node.y - halfH <= bounds.maxY
  );
}

/**
 * 判断连线是否在视口范围内（简化为判断两个端点是否都在视口外但连线穿过视口的情况不考虑，
 * 作为折中我们只判断至少有一个端点在视口内）
 */
export function isConnectionInViewport(
  parent: MindNode,
  child: MindNode,
  bounds: ViewportBounds
): boolean {
  return (
    isNodeInViewport(parent, bounds) ||
    isNodeInViewport(child, bounds)
  );
}
