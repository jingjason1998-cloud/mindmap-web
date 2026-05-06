import type { MindNode, LayoutType } from '@/types';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const LEVEL_GAP_H = 100;  // 水平层间距
const LEVEL_GAP_V = 80;   // 垂直层间距
const SIBLING_GAP = 24;   // 兄弟节点间距

function createNode(text: string, parentId: string | null = null): MindNode {
  const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    parentId,
    text,
    x: 0,
    y: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    collapsed: false,
    children: [],
  };
}

export function createInitialMindMap(): Record<string, MindNode> {
  const root = createNode('中心主题');
  const child1 = createNode('分支主题 1', root.id);
  const child2 = createNode('分支主题 2', root.id);
  const child3 = createNode('分支主题 3', root.id);
  const grandChild1 = createNode('子主题 1.1', child1.id);
  const grandChild2 = createNode('子主题 1.2', child1.id);
  const grandChild3 = createNode('子主题 2.1', child2.id);

  root.children = [child1.id, child2.id, child3.id];
  child1.children = [grandChild1.id, grandChild2.id];
  child2.children = [grandChild3.id];

  return {
    [root.id]: root,
    [child1.id]: child1,
    [child2.id]: child2,
    [child3.id]: child3,
    [grandChild1.id]: grandChild1,
    [grandChild2.id]: grandChild2,
    [grandChild3.id]: grandChild3,
  };
}

// ============================================================
// 布局引擎核心
// ============================================================

interface LayoutContext {
  nodes: Record<string, MindNode>;
  subtreeSizes: Map<string, { width: number; height: number }>;
}

/**
 * 计算子树尺寸（递归后序遍历）
 */
function calcSubtreeSizes(ctx: LayoutContext, nodeId: string, layout: LayoutType): { width: number; height: number } {
  const node = ctx.nodes[nodeId];
  if (node.collapsed || node.children.length === 0) {
    const size = { width: NODE_WIDTH, height: NODE_HEIGHT };
    ctx.subtreeSizes.set(nodeId, size);
    return size;
  }

  const isVertical = layout.startsWith('org-');
  let totalW = 0, totalH = 0;
  let maxCrossW = 0, maxCrossH = 0;

  node.children.forEach((childId, i) => {
    const childSize = calcSubtreeSizes(ctx, childId, layout);
    if (isVertical) {
      // 垂直布局：子节点水平排列
      totalW += childSize.width + (i > 0 ? SIBLING_GAP : 0);
      maxCrossH = Math.max(maxCrossH, childSize.height);
    } else {
      // 水平布局：子节点垂直排列
      totalH += childSize.height + (i > 0 ? SIBLING_GAP : 0);
      maxCrossW = Math.max(maxCrossW, childSize.width);
    }
  });

  if (isVertical) {
    const size = {
      width: Math.max(NODE_WIDTH, totalW),
      height: NODE_HEIGHT + LEVEL_GAP_V + maxCrossH,
    };
    ctx.subtreeSizes.set(nodeId, size);
    return size;
  } else {
    const size = {
      width: NODE_WIDTH + LEVEL_GAP_H + maxCrossW,
      height: Math.max(NODE_HEIGHT, totalH),
    };
    ctx.subtreeSizes.set(nodeId, size);
    return size;
  }
}

/**
 * 水平向右布局（标准思维导图右向）
 */
function layoutRight(ctx: LayoutContext, nodeId: string, x: number, startY: number) {
  const node = ctx.nodes[nodeId];
  const size = ctx.subtreeSizes.get(nodeId)!;

  node.x = x;
  node.y = startY + size.height / 2;

  if (!node.collapsed) {
    let currentY = startY;
    const childX = x + NODE_WIDTH + LEVEL_GAP_H;
    node.children.forEach(childId => {
      const childSize = ctx.subtreeSizes.get(childId)!;
      layoutRight(ctx, childId, childX, currentY);
      currentY += childSize.height + SIBLING_GAP;
    });
  }
}

/**
 * 水平向左布局
 */
function layoutLeft(ctx: LayoutContext, nodeId: string, x: number, startY: number) {
  const node = ctx.nodes[nodeId];
  const size = ctx.subtreeSizes.get(nodeId)!;

  node.x = x;
  node.y = startY + size.height / 2;

  if (!node.collapsed) {
    let currentY = startY;
    const childX = x - NODE_WIDTH - LEVEL_GAP_H;
    node.children.forEach(childId => {
      const childSize = ctx.subtreeSizes.get(childId)!;
      layoutLeft(ctx, childId, childX, currentY);
      currentY += childSize.height + SIBLING_GAP;
    });
  }
}

/**
 * 双向思维导图布局
 */
function layoutBoth(ctx: LayoutContext, nodeId: string) {
  const node = ctx.nodes[nodeId];

  // 根节点居中
  node.x = 0;
  node.y = 0;

  if (node.collapsed || node.children.length === 0) return;

  // 将子节点分为左右两组
  const mid = Math.ceil(node.children.length / 2);
  const leftChildren = node.children.slice(0, mid);
  const rightChildren = node.children.slice(mid);

  // 计算左右两侧总高度
  let leftTotalH = 0;
  leftChildren.forEach((id, i) => {
    leftTotalH += ctx.subtreeSizes.get(id)!.height + (i > 0 ? SIBLING_GAP : 0);
  });

  let rightTotalH = 0;
  rightChildren.forEach((id, i) => {
    rightTotalH += ctx.subtreeSizes.get(id)!.height + (i > 0 ? SIBLING_GAP : 0);
  });

  // 布局左侧
  let currentY = -leftTotalH / 2;
  const leftX = -NODE_WIDTH - LEVEL_GAP_H;
  leftChildren.forEach(childId => {
    const childSize = ctx.subtreeSizes.get(childId)!;
    layoutLeft(ctx, childId, leftX, currentY);
    currentY += childSize.height + SIBLING_GAP;
  });

  // 布局右侧
  currentY = -rightTotalH / 2;
  const rightX = NODE_WIDTH + LEVEL_GAP_H;
  rightChildren.forEach(childId => {
    const childSize = ctx.subtreeSizes.get(childId)!;
    layoutRight(ctx, childId, rightX, currentY);
    currentY += childSize.height + SIBLING_GAP;
  });
}

/**
 * 垂直向下布局（组织结构图）
 */
function layoutDown(ctx: LayoutContext, nodeId: string, startX: number, y: number) {
  const node = ctx.nodes[nodeId];
  const size = ctx.subtreeSizes.get(nodeId)!;

  node.x = startX + size.width / 2;
  node.y = y;

  if (!node.collapsed) {
    let currentX = startX;
    const childY = y + NODE_HEIGHT + LEVEL_GAP_V;
    node.children.forEach(childId => {
      const childSize = ctx.subtreeSizes.get(childId)!;
      layoutDown(ctx, childId, currentX, childY);
      currentX += childSize.width + SIBLING_GAP;
    });
  }
}

/**
 * 垂直向上布局
 */
function layoutUp(ctx: LayoutContext, nodeId: string, startX: number, y: number) {
  const node = ctx.nodes[nodeId];
  const size = ctx.subtreeSizes.get(nodeId)!;

  node.x = startX + size.width / 2;
  node.y = y;

  if (!node.collapsed) {
    let currentX = startX;
    const childY = y - NODE_HEIGHT - LEVEL_GAP_V;
    node.children.forEach(childId => {
      const childSize = ctx.subtreeSizes.get(childId)!;
      layoutUp(ctx, childId, currentX, childY);
      currentX += childSize.width + SIBLING_GAP;
    });
  }
}

/**
 * 逻辑图水平布局（更紧凑的层次结构）
 */
function layoutLogicRight(ctx: LayoutContext, nodeId: string, x: number, startY: number) {
  const node = ctx.nodes[nodeId];
  const size = ctx.subtreeSizes.get(nodeId)!;

  node.x = x;
  node.y = startY + size.height / 2;

  if (!node.collapsed) {
    let currentY = startY;
    const childX = x + NODE_WIDTH + LEVEL_GAP_H * 0.7;
    node.children.forEach(childId => {
      const childSize = ctx.subtreeSizes.get(childId)!;
      layoutLogicRight(ctx, childId, childX, currentY);
      currentY += childSize.height + SIBLING_GAP;
    });
  }
}

function layoutLogicLeft(ctx: LayoutContext, nodeId: string, x: number, startY: number) {
  const node = ctx.nodes[nodeId];
  const size = ctx.subtreeSizes.get(nodeId)!;

  node.x = x;
  node.y = startY + size.height / 2;

  if (!node.collapsed) {
    let currentY = startY;
    const childX = x - NODE_WIDTH - LEVEL_GAP_H * 0.7;
    node.children.forEach(childId => {
      const childSize = ctx.subtreeSizes.get(childId)!;
      layoutLogicLeft(ctx, childId, childX, currentY);
      currentY += childSize.height + SIBLING_GAP;
    });
  }
}

// ============================================================
// 主入口
// ============================================================

export function calculateTreeLayout(
  nodes: Record<string, MindNode>,
  rootId: string,
  layout: LayoutType = 'mindmap-right'
): Record<string, MindNode> {
  const result: Record<string, MindNode> = {};
  Object.keys(nodes).forEach(id => {
    result[id] = { ...nodes[id] };
  });

  const root = result[rootId];
  if (!root) return result;

  const ctx: LayoutContext = {
    nodes: result,
    subtreeSizes: new Map(),
  };

  // 第一步：计算所有子树尺寸
  calcSubtreeSizes(ctx, rootId, layout);

  // 第二步：根据布局类型进行定位
  const rootSize = ctx.subtreeSizes.get(rootId)!;

  switch (layout) {
    case 'mindmap-right': {
      const totalH = rootSize.height;
      layoutRight(ctx, rootId, 0, -totalH / 2);
      break;
    }
    case 'mindmap-left': {
      const totalH = rootSize.height;
      layoutLeft(ctx, rootId, 0, -totalH / 2);
      break;
    }
    case 'mindmap-both': {
      layoutBoth(ctx, rootId);
      break;
    }
    case 'org-down': {
      const totalW = rootSize.width;
      layoutDown(ctx, rootId, -totalW / 2, 0);
      break;
    }
    case 'org-up': {
      const totalW = rootSize.width;
      layoutUp(ctx, rootId, -totalW / 2, 0);
      break;
    }
    case 'logic-right': {
      const totalH = rootSize.height;
      layoutLogicRight(ctx, rootId, 0, -totalH / 2);
      break;
    }
    case 'logic-left': {
      const totalH = rootSize.height;
      layoutLogicLeft(ctx, rootId, 0, -totalH / 2);
      break;
    }
  }

  // 兜底：被折叠的子树节点坐标与父节点重叠，防止意外渲染
  Object.values(result).forEach(node => {
    if (node.parentId) {
      const parent = result[node.parentId];
      if (parent && parent.collapsed) {
        node.x = parent.x;
        node.y = parent.y;
      }
    }
  });

  return result;
}

// ============================================================
// 节点操作
// ============================================================

export function addChildNode(
  nodes: Record<string, MindNode>,
  parentId: string
): Record<string, MindNode> {
  const parent = nodes[parentId];
  if (!parent) return nodes;

  const newNode = createNode('新节点', parentId);
  const result = { ...nodes, [newNode.id]: newNode };
  result[parentId] = { ...parent, children: [...parent.children, newNode.id] };

  return result;
}

export function addSiblingNode(
  nodes: Record<string, MindNode>,
  nodeId: string
): Record<string, MindNode> {
  const node = nodes[nodeId];
  if (!node || !node.parentId) return nodes;

  const parent = nodes[node.parentId];
  if (!parent) return nodes;

  const newNode = createNode('新节点', parent.id);
  const siblingIndex = parent.children.indexOf(nodeId);
  const newChildren = [...parent.children];
  newChildren.splice(siblingIndex + 1, 0, newNode.id);

  const result = { ...nodes, [newNode.id]: newNode };
  result[parent.id] = { ...parent, children: newChildren };

  return result;
}

export function deleteNode(
  nodes: Record<string, MindNode>,
  nodeId: string
): Record<string, MindNode> {
  const node = nodes[nodeId];
  if (!node || !node.parentId) return nodes;

  const result = { ...nodes };
  const parent = result[node.parentId];
  result[node.parentId] = {
    ...parent,
    children: parent.children.filter(id => id !== nodeId),
  };

  function deleteRecursive(id: string) {
    const n = result[id];
    if (n) {
      n.children.forEach(deleteRecursive);
      delete result[id];
    }
  }
  deleteRecursive(nodeId);

  return result;
}

export function updateNodeText(
  nodes: Record<string, MindNode>,
  nodeId: string,
  text: string
): Record<string, MindNode> {
  const node = nodes[nodeId];
  if (!node) return nodes;

  return {
    ...nodes,
    [nodeId]: { ...node, text },
  };
}

export function toggleNodeCollapse(
  nodes: Record<string, MindNode>,
  nodeId: string
): Record<string, MindNode> {
  const node = nodes[nodeId];
  if (!node || node.children.length === 0) return nodes;

  return {
    ...nodes,
    [nodeId]: { ...node, collapsed: !node.collapsed },
  };
}
