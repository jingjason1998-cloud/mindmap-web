import type { MindMapState, MindNode } from '@/types';

// ============================================================
// JSON 导出 / 导入
// ============================================================

export interface ExportData {
  version: string;
  name: string;
  layout: MindMapState['layout'];
  theme: MindMapState['theme'];
  rootNodeId: string;
  nodes: Record<string, MindNode>;
  exportTime: string;
}

export function exportToJSON(state: Pick<MindMapState, 'name' | 'layout' | 'theme' | 'rootNodeId' | 'nodes'>): string {
  const data: ExportData = {
    version: '1.0',
    name: state.name,
    layout: state.layout,
    theme: state.theme,
    rootNodeId: state.rootNodeId,
    nodes: state.nodes,
    exportTime: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importFromJSON(json: string): Partial<ExportData> | null {
  try {
    const data = JSON.parse(json) as ExportData;
    if (!data.nodes || !data.rootNodeId) return null;
    return data;
  } catch {
    return null;
  }
}

export function downloadJSON(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// Markdown 导出 / 导入
// ============================================================

/**
 * 将思维导图导出为 Markdown 大纲格式
 */
export function exportToMarkdown(nodes: Record<string, MindNode>, rootId: string): string {
  const lines: string[] = [];

  function traverse(nodeId: string, depth: number) {
    const node = nodes[nodeId];
    if (!node) return;

    const indent = '  '.repeat(depth);
    lines.push(`${indent}- ${node.text}`);

    if (node.data?.note) {
      const noteLines = node.data.note.split('\n').map(l => `${indent}  > ${l}`);
      lines.push(...noteLines);
    }

    if (!node.collapsed) {
      node.children.forEach(childId => traverse(childId, depth + 1));
    }
  }

  traverse(rootId, 0);
  return lines.join('\n');
}

/**
 * 从 Markdown 大纲导入思维导图
 */
export function importFromMarkdown(md: string): { nodes: Record<string, MindNode>; rootId: string } | null {
  const lines = md.split('\n').filter(l => l.trim());
  if (lines.length === 0) return null;

  const nodes: Record<string, MindNode> = {};
  const stack: { id: string; depth: number }[] = [];
  let rootId = '';

  for (const line of lines) {
    const match = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (!match) continue;

    const depth = match[1].length / 2;
    const text = match[2].trim();

    const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const node: MindNode = {
      id,
      parentId: null,
      text,
      x: 0,
      y: 0,
      width: 140,
      height: 44,
      children: [],
    };

    // 找到父节点
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = nodes[stack[stack.length - 1].id];
      node.parentId = parent.id;
      parent.children.push(id);
    } else {
      rootId = id;
    }

    nodes[id] = node;
    stack.push({ id, depth });
  }

  if (!rootId) return null;
  return { nodes, rootId };
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// PNG 导出
// ============================================================

import { toPng } from 'html-to-image';

export async function exportToPNG(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(element, {
    backgroundColor: '#f9fafb',
    pixelRatio: 2,
    cacheBust: true,
  });

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
