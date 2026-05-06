import type { MindMapState, MindNode, LayoutType } from '@/types';

const HASH_PREFIX = 'mindmap=';

/**
 * 将思维导图数据压缩为 URL-safe 字符串
 */
export function encodeToHash(state: Pick<MindMapState, 'name' | 'layout' | 'rootNodeId' | 'nodes'>): string {
  const payload = {
    n: state.name,
    l: state.layout,
    r: state.rootNodeId,
    d: compressNodes(state.nodes),
  };
  const json = JSON.stringify(payload);
  // 使用 btoa + URL-safe 替换
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 从 URL hash 解码思维导图数据
 */
export function decodeFromHash(hash: string): { nodes: Record<string, MindNode>; rootNodeId: string; layout: LayoutType; name: string } | null {
  if (!hash || !hash.startsWith(HASH_PREFIX)) return null;

  try {
    const base64 = hash.slice(HASH_PREFIX.length)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    // 补齐 padding
    const pad = base64.length % 4;
    const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;

    const json = decodeURIComponent(escape(atob(paddedBase64)));
    const payload = JSON.parse(json);

    return {
      name: payload.n || '分享的思维导图',
      layout: payload.l || 'mindmap-right',
      rootNodeId: payload.r,
      nodes: decompressNodes(payload.d),
    };
  } catch {
    return null;
  }
}

/**
 * 压缩节点数据，去除布局坐标（重新计算），减小体积
 */
function compressNodes(nodes: Record<string, MindNode>): Record<string, CompressedNode> {
  const result: Record<string, CompressedNode> = {};
  Object.entries(nodes).forEach(([id, node]) => {
    result[id] = {
      t: node.text,
      p: node.parentId,
      c: node.children,
      x: node.collapsed,
      // 可选：保留样式和备注
      ...(node.style ? { s: node.style } : {}),
      ...(node.data ? { d: node.data } : {}),
    };
  });
  return result;
}

/**
 * 解压节点数据，恢复完整结构
 */
function decompressNodes(data: Record<string, CompressedNode>): Record<string, MindNode> {
  const result: Record<string, MindNode> = {};
  Object.entries(data).forEach(([id, node]) => {
    result[id] = {
      id,
      text: node.t,
      parentId: node.p,
      children: node.c,
      x: 0,
      y: 0,
      width: 140,
      height: 44,
      collapsed: node.x || false,
      ...(node.s ? { style: node.s } : {}),
      ...(node.d ? { data: node.d } : {}),
    };
  });
  return result;
}

interface CompressedNode {
  t: string;        // text
  p: string | null; // parentId
  c: string[];      // children
  x?: boolean;      // collapsed
  s?: MindNode['style'];
  d?: MindNode['data'];
}

/**
 * 复制分享链接到剪贴板
 */
export async function copyShareLink(hash: string): Promise<void> {
  const url = `${window.location.origin}${window.location.pathname}#${HASH_PREFIX}${hash}`;
  await navigator.clipboard.writeText(url);
}

/**
 * 从当前 URL 读取 hash 并解析
 */
export function readHashFromURL(): string | null {
  const hash = window.location.hash.slice(1); // 去掉开头的 #
  if (hash.startsWith(HASH_PREFIX)) {
    return hash;
  }
  return null;
}

/**
 * 将 hash 写入当前 URL（不刷新页面）
 */
export function writeHashToURL(hash: string): void {
  const newHash = `#${HASH_PREFIX}${hash}`;
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, '', newHash);
  }
}

/**
 * 清空 URL hash
 */
export function clearHashFromURL(): void {
  window.history.replaceState(null, '', window.location.pathname);
}
