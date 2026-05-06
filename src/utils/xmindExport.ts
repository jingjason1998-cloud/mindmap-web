import JSZip from 'jszip';
import type { MindNode } from '@/types';

interface XMindNode {
  id: string;
  title: string;
  children?: {
    attached?: XMindNode[];
  };
  labels?: string[];
  markers?: Array<{ markerId: string }>;
  notes?: {
    plain: { content: string };
  };
}

interface XMindSheet {
  id: string;
  title: string;
  rootTopic: XMindNode;
}

function convertToXMindNode(node: MindNode, nodes: Record<string, MindNode>): XMindNode {
  const result: XMindNode = {
    id: node.id,
    title: node.text,
  };

  if (node.data?.note) {
    result.notes = {
      plain: { content: node.data.note },
    };
  }

  if (node.children.length > 0) {
    result.children = { attached: [] };
    node.children.forEach(childId => {
      const child = nodes[childId];
      if (child) {
        result.children!.attached!.push(convertToXMindNode(child, nodes));
      }
    });
  }

  return result;
}

/**
 * 导出单个思维导图为 XMind Sheet
 */
function createSheet(
  name: string,
  rootNodeId: string,
  nodes: Record<string, MindNode>
): XMindSheet {
  const rootNode = nodes[rootNodeId];
  const rootTopic = convertToXMindNode(rootNode, nodes);

  return {
    id: `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    title: name,
    rootTopic,
  };
}

/**
 * 导出为 XMind 文件（支持多画布）
 */
export function exportToXMind(sheets: Array<{
  name: string;
  rootNodeId: string;
  nodes: Record<string, MindNode>;
}>): JSZip {
  const zip = new JSZip();

  const xmindSheets = sheets.map(s => createSheet(s.name, s.rootNodeId, s.nodes));
  const content = xmindSheets;

  zip.file('content.json', JSON.stringify(content, null, 2));

  const manifest = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<manifest xmlns="urn:xmind:xmap:xmlns:manifest:1.0">
  <file-entry full-path="content.json" media-type="application/json"/>
</manifest>`;
  zip.folder('META-INF')!.file('manifest.xml', manifest);

  return zip;
}

/**
 * 下载 XMind 文件
 */
export async function downloadXMind(
  filename: string,
  sheets: Array<{
    name: string;
    rootNodeId: string;
    nodes: Record<string, MindNode>;
  }>
): Promise<void> {
  const zip = exportToXMind(sheets);
  const blob = await zip.generateAsync({ type: 'blob' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xmind') ? filename : `${filename}.xmind`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
