export interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  borderRadius?: number;
  fontSize?: number;
  fontWeight?: string;
  shape?: 'rectangle' | 'rounded' | 'pill';
}

export interface NodeData {
  note?: string;
  link?: string;
  image?: string;
  icon?: string;
  priority?: number;
  progress?: number;
}

export interface MindNode {
  id: string;
  parentId: string | null;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed?: boolean;
  style?: NodeStyle;
  data?: NodeData;
  children: string[];
}

export type LayoutType = 'mindmap-right' | 'mindmap-left' | 'mindmap-both' | 'org-down' | 'org-up' | 'logic-right' | 'logic-left';

export type ThemeType = 'default' | 'dark' | 'colorful' | 'simple';

export interface MindMapState {
  id: string;
  name: string;
  rootNodeId: string;
  nodes: Record<string, MindNode>;
  layout: LayoutType;
  theme: ThemeType;
  scale: number;
  offsetX: number;
  offsetY: number;
  selectedNodeId: string | null;
  editingNodeId: string | null;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

// 富文本片段类型
export interface RichTextSegment {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link' | 'image';
  content: string;
  url?: string;
}
