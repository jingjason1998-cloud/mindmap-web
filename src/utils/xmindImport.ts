import JSZip from 'jszip';
import type { MindNode } from '@/types';

interface XMindNode {
  id: string;
  title: string;
  children?: {
    attached?: XMindNode[];
  };
  labels?: string[];
  notes?: {
    plain?: { content: string };
  };
  markers?: Array<{ markerId: string }>;
}

interface XMindSheet {
  id: string;
  title: string;
  rootTopic: XMindNode;
}

export interface XMindImportResult {
  sheets: Array<{
    name: string;
    rootNodeId: string;
    nodes: Record<string, MindNode>;
  }>;
}

/**
 * 解析 XMind 文件（支持 XMind 8 / Zen / 2020+），返回所有画布
 */
export async function importFromXMind(file: File): Promise<XMindImportResult | null> {
  try {
    const zip = await JSZip.loadAsync(file);

    // XMind 2020+ 使用 content.json
    let contentFile = zip.file('content.json');
    let isJson = true;

    // XMind 8 使用 content.xml
    if (!contentFile) {
      contentFile = zip.file('content.xml');
      isJson = false;
    }

    if (!contentFile) {
      throw new Error('找不到 content.json 或 content.xml');
    }

    const contentText = await contentFile.async('text');

    let sheets: XMindSheet[] = [];

    if (isJson) {
      const content = JSON.parse(contentText) as XMindSheet | XMindSheet[];
      sheets = Array.isArray(content) ? content : [content];
    } else {
      // XMind 8 XML 格式
      const rootTopic = parseXMindXML(contentText);
      sheets = [{ id: 'sheet-1', title: file.name.replace(/\.xmind$/i, ''), rootTopic }];
    }

    const result: XMindImportResult = { sheets: [] };

    for (const sheet of sheets) {
      const nodes: Record<string, MindNode> = {};
      const rootId = convertNode(sheet.rootTopic, null, nodes);
      result.sheets.push({
        name: sheet.title || file.name.replace(/\.xmind$/i, ''),
        rootNodeId: rootId,
        nodes,
      });
    }

    return result;
  } catch (error) {
    console.error('XMind 导入失败:', error);
    return null;
  }
}

function convertNode(
  xmindNode: XMindNode,
  parentId: string | null,
  result: Record<string, MindNode>
): string {
  const id = `xmind-${xmindNode.id || Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  const node: MindNode = {
    id,
    parentId,
    text: xmindNode.title || '未命名',
    x: 0,
    y: 0,
    width: 140,
    height: 44,
    children: [],
  };

  if (xmindNode.notes?.plain?.content) {
    node.data = { note: xmindNode.notes.plain.content };
  }

  if (xmindNode.labels && xmindNode.labels.length > 0) {
    node.text += ` #${xmindNode.labels.join(' #')}`;
  }

  result[id] = node;

  const children = xmindNode.children?.attached || [];
  children.forEach(child => {
    const childId = convertNode(child, id, result);
    node.children.push(childId);
  });

  return id;
}

function parseXMindXML(xmlText: string): XMindNode {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML 解析失败');
  }

  const rootTopicEl = doc.querySelector('topic');
  if (!rootTopicEl) {
    throw new Error('找不到 root topic');
  }

  return parseTopicElement(rootTopicEl);
}

function parseTopicElement(el: Element): XMindNode {
  const node: XMindNode = {
    id: el.getAttribute('id') || '',
    title: '',
  };

  const titleEl = el.querySelector(':scope > title');
  if (titleEl) {
    node.title = titleEl.textContent || '';
  }

  const notesEl = el.querySelector(':scope > notes > plain');
  if (notesEl?.textContent) {
    node.notes = { plain: { content: notesEl.textContent } };
  }

  const childrenEl = el.querySelector(':scope > children');
  if (childrenEl) {
    const attachedTopics = childrenEl.querySelectorAll(':scope > topics[type="attached"] > topic');
    if (attachedTopics.length > 0) {
      node.children = { attached: [] };
      attachedTopics.forEach(childEl => {
        node.children!.attached!.push(parseTopicElement(childEl));
      });
    }
  }

  return node;
}
