import { create } from 'zustand';
import type { MindNode, LayoutType, ThemeType } from '@/types';
import {
  createInitialMindMap,
  calculateTreeLayout,
  addChildNode,
  addSiblingNode,
  deleteNode,
  updateNodeText,
  toggleNodeCollapse,
} from '@/utils/treeLayout';
import {
  encodeToHash,
  decodeFromHash,
  readHashFromURL,
  writeHashToURL,
  clearHashFromURL,
} from '@/utils/urlShare';

const STORAGE_KEY = 'mindmap-tabs';
const MAX_HISTORY = 50;

// ========================
// Tab 数据结构
// ========================

interface Tab {
  id: string;
  name: string;
  rootNodeId: string;
  nodes: Record<string, MindNode>;
  layout: LayoutType;
  theme: ThemeType;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  lastSavedAt: string | null;
  history: HistorySnapshot[];
  historyIndex: number;
}

interface HistorySnapshot {
  name: string;
  rootNodeId: string;
  nodes: Record<string, MindNode>;
  layout: LayoutType;
  theme: ThemeType;
}

function createSnapshot(tab: Pick<Tab, 'name' | 'rootNodeId' | 'nodes' | 'layout' | 'theme'>): HistorySnapshot {
  return {
    name: tab.name,
    rootNodeId: tab.rootNodeId,
    nodes: JSON.parse(JSON.stringify(tab.nodes)),
    layout: tab.layout,
    theme: tab.theme,
  };
}

function createEmptyTab(): Tab {
  const nodes = createInitialMindMap();
  const rootId = Object.values(nodes).find(n => n.parentId === null)!.id;
  const laidOut = calculateTreeLayout(nodes, rootId, 'mindmap-right');
  const snapshot = createSnapshot({
    name: '未命名思维导图',
    rootNodeId: rootId,
    nodes: laidOut,
    layout: 'mindmap-right',
    theme: 'default',
  });
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: '未命名思维导图',
    rootNodeId: rootId,
    nodes: laidOut,
    layout: 'mindmap-right',
    theme: 'default',
    saveStatus: 'unsaved',
    lastSavedAt: null,
    history: [snapshot],
    historyIndex: 0,
  };
}

function createTabFromData(data: {
  name: string;
  rootNodeId: string;
  nodes: Record<string, MindNode>;
  layout?: LayoutType;
  theme?: ThemeType;
}): Tab {
  const layout = data.layout || 'mindmap-right';
  const nodes = calculateTreeLayout(data.nodes, data.rootNodeId, layout);
  const snapshot = createSnapshot({
    name: data.name,
    rootNodeId: data.rootNodeId,
    nodes,
    layout,
    theme: data.theme || 'default',
  });
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: data.name,
    rootNodeId: data.rootNodeId,
    nodes,
    layout,
    theme: data.theme || 'default',
    saveStatus: 'unsaved',
    lastSavedAt: null,
    history: [snapshot],
    historyIndex: 0,
  };
}

// ========================
// 本地存储
// ========================

function saveAllTabs(tabs: Tab[], activeTabId: string) {
  try {
    const data = JSON.stringify({
      tabs: tabs.map(t => ({
        id: t.id,
        name: t.name,
        rootNodeId: t.rootNodeId,
        nodes: t.nodes,
        layout: t.layout,
        theme: t.theme,
      })),
      activeTabId,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY, data);
  } catch {
    // localStorage 可能已满
  }
}

function loadAllTabs(): { tabs: Tab[]; activeTabId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.tabs || !Array.isArray(data.tabs) || data.tabs.length === 0) return null;

    const tabs: Tab[] = data.tabs.map((t: unknown) => {
      const tab = t as { id: string; name: string; rootNodeId: string; nodes: Record<string, MindNode>; layout: LayoutType; theme: ThemeType };
      const nodes = calculateTreeLayout(tab.nodes, tab.rootNodeId, tab.layout);
      const snapshot = createSnapshot({ name: tab.name, rootNodeId: tab.rootNodeId, nodes, layout: tab.layout, theme: tab.theme });
      return {
        id: tab.id,
        name: tab.name,
        rootNodeId: tab.rootNodeId,
        nodes,
        layout: tab.layout,
        theme: tab.theme,
        saveStatus: 'saved' as const,
        lastSavedAt: new Date().toISOString(),
        history: [snapshot],
        historyIndex: 0,
      };
    });

    const activeTabId = data.activeTabId || tabs[0].id;
    return { tabs, activeTabId };
  } catch {
    return null;
  }
}

// ========================
// Store 定义
// ========================

interface MindMapStore {
  // Tabs
  tabs: Tab[];
  activeTabId: string;

  // Derived from active tab
  name: string;
  rootNodeId: string;
  nodes: Record<string, MindNode>;
  layout: LayoutType;
  theme: ThemeType;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  lastSavedAt: string | null;
  shareHash: string | null;
  canUndo: boolean;
  canRedo: boolean;

  // UI State (global)
  scale: number;
  offsetX: number;
  offsetY: number;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;

  // Tab management
  newTab: () => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;

  // Node operations
  initialize: () => void;
  setName: (name: string) => void;
  setLayout: (layout: LayoutType) => void;
  setTheme: (theme: ThemeType) => void;
  selectNode: (nodeId: string | null) => void;
  startEditing: (nodeId: string | null) => void;
  updateNodeText: (nodeId: string, text: string) => void;
  addChild: (parentId: string) => void;
  addSibling: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  toggleCollapse: (nodeId: string) => void;

  // Viewport
  setScale: (scale: number) => void;
  setOffset: (x: number, y: number) => void;
  startDrag: (x: number, y: number) => void;
  endDrag: () => void;
  drag: (x: number, y: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitToView: (containerWidth: number, containerHeight: number) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Import / Export / Share
  loadFromData: (data: { nodes: Record<string, MindNode>; rootNodeId: string; layout?: LayoutType; theme?: ThemeType; name?: string }) => void;
  importXMindSheets: (sheets: Array<{ name: string; rootNodeId: string; nodes: Record<string, MindNode> }>) => void;
  saveToLocal: () => void;
  loadFromLocal: () => boolean;
  clearLocal: () => void;
  generateShareLink: () => string;
  loadFromHash: () => boolean;
}

// 获取当前 active tab
function getActiveTab(tabs: Tab[], activeTabId: string): Tab | null {
  return tabs.find(t => t.id === activeTabId) || tabs[0] || null;
}

// 更新 tabs 中的某个 tab
function updateTab(tabs: Tab[], tabId: string, updates: Partial<Tab>): Tab[] {
  return tabs.map(t => t.id === tabId ? { ...t, ...updates } : t);
}

// 获取 active tab 的派生状态
function getDerivedState(tabs: Tab[], activeTabId: string): Pick<MindMapStore, 'name' | 'rootNodeId' | 'nodes' | 'layout' | 'theme' | 'saveStatus' | 'lastSavedAt' | 'shareHash' | 'canUndo' | 'canRedo'> {
  const tab = getActiveTab(tabs, activeTabId);
  if (!tab) {
    return {
      name: '',
      rootNodeId: '',
      nodes: {} as Record<string, MindNode>,
      layout: 'mindmap-right',
      theme: 'default',
      saveStatus: 'unsaved',
      lastSavedAt: null,
      shareHash: null,
      canUndo: false,
      canRedo: false,
    };
  }
  return {
    name: tab.name,
    rootNodeId: tab.rootNodeId,
    nodes: tab.nodes,
    layout: tab.layout,
    theme: tab.theme,
    saveStatus: tab.saveStatus,
    lastSavedAt: tab.lastSavedAt,
    shareHash: null,
    canUndo: tab.historyIndex > 0,
    canRedo: tab.historyIndex < tab.history.length - 1,
  };
}

// 检查 URL hash
function getInitialTabs(): { tabs: Tab[]; activeTabId: string } {
  const hashData = readHashFromURL();
  if (hashData) {
    const decoded = decodeFromHash(hashData);
    if (decoded) {
      const tab = createTabFromData({
        name: decoded.name,
        rootNodeId: decoded.rootNodeId,
        nodes: decoded.nodes,
        layout: decoded.layout,
      });
      return { tabs: [tab], activeTabId: tab.id };
    }
  }

  const persisted = loadAllTabs();
  if (persisted) {
    return persisted;
  }

  const tab = createEmptyTab();
  return { tabs: [tab], activeTabId: tab.id };
}

const initial = getInitialTabs();

export const useMindMapStore = create<MindMapStore>((set, get) => {
  const derived = getDerivedState(initial.tabs, initial.activeTabId);

  return {
    tabs: initial.tabs,
    activeTabId: initial.activeTabId,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    selectedNodeId: null,
    editingNodeId: null,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    ...derived,

    // ========================
    // Tab Management
    // ========================

    newTab: () => {
      const { tabs } = get();
      const newTab = createEmptyTab();
      const updatedTabs = [...tabs, newTab];
      set({
        tabs: updatedTabs,
        activeTabId: newTab.id,
        selectedNodeId: null,
        editingNodeId: null,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        ...getDerivedState(updatedTabs, newTab.id),
      });
      saveAllTabs(updatedTabs, newTab.id);
    },

    closeTab: (tabId) => {
      const { tabs, activeTabId } = get();
      if (tabs.length <= 1) {
        // 最后一个 tab，重置为空白
        const newTab = createEmptyTab();
        set({
          tabs: [newTab],
          activeTabId: newTab.id,
          selectedNodeId: null,
          editingNodeId: null,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          ...getDerivedState([newTab], newTab.id),
        });
        saveAllTabs([newTab], newTab.id);
        return;
      }

      const tabIndex = tabs.findIndex(t => t.id === tabId);
      const updatedTabs = tabs.filter(t => t.id !== tabId);

      let newActiveId = activeTabId;
      if (activeTabId === tabId) {
        // 关闭当前 tab，切换到相邻 tab
        const newIndex = Math.min(tabIndex, updatedTabs.length - 1);
        newActiveId = updatedTabs[Math.max(0, newIndex)].id;
      }

      set({
        tabs: updatedTabs,
        activeTabId: newActiveId,
        selectedNodeId: null,
        editingNodeId: null,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        ...getDerivedState(updatedTabs, newActiveId),
      });
      saveAllTabs(updatedTabs, newActiveId);
    },

    switchTab: (tabId) => {
      const { tabs } = get();
      set({
        activeTabId: tabId,
        selectedNodeId: null,
        editingNodeId: null,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        ...getDerivedState(tabs, tabId),
      });
      saveAllTabs(tabs, tabId);
    },

    renameTab: (tabId, name) => {
      const { tabs, activeTabId } = get();
      const updatedTabs = updateTab(tabs, tabId, { name });
      set({
        tabs: updatedTabs,
        ...getDerivedState(updatedTabs, activeTabId),
      });
      saveAllTabs(updatedTabs, activeTabId);
    },

    // ========================
    // Node Operations
    // ========================

    initialize: () => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab) return;

      const nodes = createInitialMindMap();
      const rootId = Object.values(nodes).find(n => n.parentId === null)!.id;
      const laidOut = calculateTreeLayout(nodes, rootId, 'mindmap-right');
      const snapshot = createSnapshot({ name: '未命名思维导图', rootNodeId: rootId, nodes: laidOut, layout: 'mindmap-right', theme: 'default' });

      const updatedTab = {
        ...tab,
        name: '未命名思维导图',
        rootNodeId: rootId,
        nodes: laidOut,
        layout: 'mindmap-right' as LayoutType,
        theme: 'default' as ThemeType,
        saveStatus: 'unsaved' as const,
        lastSavedAt: null,
        history: [snapshot],
        historyIndex: 0,
      };

      const updatedTabs = updateTab(tabs, activeTabId, updatedTab);
      set({
        tabs: updatedTabs,
        selectedNodeId: null,
        editingNodeId: null,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        ...getDerivedState(updatedTabs, activeTabId),
      });
      clearHashFromURL();
      saveAllTabs(updatedTabs, activeTabId);
    },

    setName: (name) => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab) return;

      // Push history
      const newHistory = tab.history.slice(0, tab.historyIndex + 1);
      newHistory.push(createSnapshot({ ...tab, name }));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();

      const updatedTabs = updateTab(tabs, activeTabId, {
        name,
        saveStatus: 'unsaved',
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
      set({ tabs: updatedTabs, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    setLayout: (layout) => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab) return;

      const nodes = calculateTreeLayout(tab.nodes, tab.rootNodeId, layout);
      const newHistory = tab.history.slice(0, tab.historyIndex + 1);
      newHistory.push(createSnapshot({ ...tab, nodes, layout }));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();

      const updatedTabs = updateTab(tabs, activeTabId, {
        nodes,
        layout,
        saveStatus: 'unsaved',
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
      set({ tabs: updatedTabs, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    setTheme: (theme) => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab) return;

      const newHistory = tab.history.slice(0, tab.historyIndex + 1);
      newHistory.push(createSnapshot({ ...tab, theme }));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();

      const updatedTabs = updateTab(tabs, activeTabId, {
        theme,
        saveStatus: 'unsaved',
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
      set({ tabs: updatedTabs, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    selectNode: (nodeId) => set({ selectedNodeId: nodeId, editingNodeId: null }),
    startEditing: (nodeId) => set({ editingNodeId: nodeId }),

    updateNodeText: (nodeId, text) => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab) return;

      const updated = updateNodeText(tab.nodes, nodeId, text);
      const nodes = calculateTreeLayout(updated, tab.rootNodeId, tab.layout);
      const newHistory = tab.history.slice(0, tab.historyIndex + 1);
      newHistory.push(createSnapshot({ ...tab, nodes }));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();

      const updatedTabs = updateTab(tabs, activeTabId, {
        nodes,
        saveStatus: 'unsaved',
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
      set({ tabs: updatedTabs, editingNodeId: null, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    addChild: (parentId) => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab) return;

      const updated = addChildNode(tab.nodes, parentId);
      const nodes = calculateTreeLayout(updated, tab.rootNodeId, tab.layout);
      const newHistory = tab.history.slice(0, tab.historyIndex + 1);
      newHistory.push(createSnapshot({ ...tab, nodes }));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();

      const updatedTabs = updateTab(tabs, activeTabId, {
        nodes,
        saveStatus: 'unsaved',
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
      set({ tabs: updatedTabs, selectedNodeId: null, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    addSibling: (nodeId) => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab) return;

      const updated = addSiblingNode(tab.nodes, nodeId);
      const nodes = calculateTreeLayout(updated, tab.rootNodeId, tab.layout);
      const newHistory = tab.history.slice(0, tab.historyIndex + 1);
      newHistory.push(createSnapshot({ ...tab, nodes }));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();

      const updatedTabs = updateTab(tabs, activeTabId, {
        nodes,
        saveStatus: 'unsaved',
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
      set({ tabs: updatedTabs, selectedNodeId: null, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    deleteNode: (nodeId) => {
      const { tabs, activeTabId, selectedNodeId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab || nodeId === tab.rootNodeId) return;

      const updated = deleteNode(tab.nodes, nodeId);
      const nodes = calculateTreeLayout(updated, tab.rootNodeId, tab.layout);
      const newHistory = tab.history.slice(0, tab.historyIndex + 1);
      newHistory.push(createSnapshot({ ...tab, nodes }));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();

      const updatedTabs = updateTab(tabs, activeTabId, {
        nodes,
        saveStatus: 'unsaved',
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
      set({ tabs: updatedTabs, selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    toggleCollapse: (nodeId) => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab) return;

      const updated = toggleNodeCollapse(tab.nodes, nodeId);
      const nodes = calculateTreeLayout(updated, tab.rootNodeId, tab.layout);
      const newHistory = tab.history.slice(0, tab.historyIndex + 1);
      newHistory.push(createSnapshot({ ...tab, nodes }));
      if (newHistory.length > MAX_HISTORY) newHistory.shift();

      const updatedTabs = updateTab(tabs, activeTabId, {
        nodes,
        saveStatus: 'unsaved',
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
      set({ tabs: updatedTabs, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    // Viewport
    setScale: (scale) => set({ scale: Math.max(0.1, Math.min(3, scale)) }),
    setOffset: (x, y) => set({ offsetX: x, offsetY: y }),
    startDrag: (x, y) => set({ isDragging: true, dragStartX: x, dragStartY: y }),
    endDrag: () => set({ isDragging: false }),
    drag: (x, y) => {
      const { isDragging, dragStartX, dragStartY, offsetX, offsetY } = get();
      if (!isDragging) return;
      set({ offsetX: offsetX + (x - dragStartX), offsetY: offsetY + (y - dragStartY), dragStartX: x, dragStartY: y });
    },
    zoomIn: () => { const { scale } = get(); set({ scale: Math.min(3, scale + 0.1) }); },
    zoomOut: () => { const { scale } = get(); set({ scale: Math.max(0.1, scale - 0.1) }); },
    resetView: () => set({ scale: 1, offsetX: 0, offsetY: 0 }),
    fitToView: (containerWidth, containerHeight) => {
      const { nodes } = get();
      const nodeList = Object.values(nodes);
      if (nodeList.length === 0) return;

      // 计算所有节点的边界框
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodeList.forEach(node => {
        const halfW = node.width / 2;
        const halfH = node.height / 2;
        minX = Math.min(minX, node.x - halfW);
        maxX = Math.max(maxX, node.x + halfW);
        minY = Math.min(minY, node.y - halfH);
        maxY = Math.max(maxY, node.y + halfH);
      });

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      if (contentWidth <= 0 || contentHeight <= 0) return;

      const padding = 80;
      const availableW = containerWidth - padding * 2;
      const availableH = containerHeight - padding * 2;

      const scaleX = availableW / contentWidth;
      const scaleY = availableH / contentHeight;
      let scale = Math.min(scaleX, scaleY);
      scale = Math.max(0.3, Math.min(1.2, scale));

      const offsetX = containerWidth / 2 - (minX + maxX) / 2 * scale;
      const offsetY = containerHeight / 2 - (minY + maxY) / 2 * scale;

      set({ scale, offsetX, offsetY });
    },

    // History
    undo: () => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab || tab.historyIndex <= 0) return;

      const newIndex = tab.historyIndex - 1;
      const snapshot = tab.history[newIndex];
      const nodes = calculateTreeLayout(snapshot.nodes, snapshot.rootNodeId, snapshot.layout);

      const updatedTabs = updateTab(tabs, activeTabId, {
        nodes,
        rootNodeId: snapshot.rootNodeId,
        name: snapshot.name,
        layout: snapshot.layout,
        theme: snapshot.theme,
        saveStatus: 'unsaved',
        historyIndex: newIndex,
      });
      set({ tabs: updatedTabs, selectedNodeId: null, editingNodeId: null, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    redo: () => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab || tab.historyIndex >= tab.history.length - 1) return;

      const newIndex = tab.historyIndex + 1;
      const snapshot = tab.history[newIndex];
      const nodes = calculateTreeLayout(snapshot.nodes, snapshot.rootNodeId, snapshot.layout);

      const updatedTabs = updateTab(tabs, activeTabId, {
        nodes,
        rootNodeId: snapshot.rootNodeId,
        name: snapshot.name,
        layout: snapshot.layout,
        theme: snapshot.theme,
        saveStatus: 'unsaved',
        historyIndex: newIndex,
      });
      set({ tabs: updatedTabs, selectedNodeId: null, editingNodeId: null, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    // Import / Export
    loadFromData: (data) => {
      const { tabs } = get();
      const newTab = createTabFromData({
        name: data.name || '导入的思维导图',
        rootNodeId: data.rootNodeId,
        nodes: data.nodes,
        layout: data.layout,
        theme: data.theme,
      });
      const updatedTabs = [...tabs, newTab];
      set({
        tabs: updatedTabs,
        activeTabId: newTab.id,
        selectedNodeId: null,
        editingNodeId: null,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        ...getDerivedState(updatedTabs, newTab.id),
      });
      clearHashFromURL();
      saveAllTabs(updatedTabs, newTab.id);
    },

    saveToLocal: () => {
      const { tabs, activeTabId } = get();
      const updatedTabs = updateTab(tabs, activeTabId, { saveStatus: 'saved', lastSavedAt: new Date().toISOString() });
      set({ tabs: updatedTabs, ...getDerivedState(updatedTabs, activeTabId) });
      saveAllTabs(updatedTabs, activeTabId);
    },

    loadFromLocal: () => {
      const persisted = loadAllTabs();
      if (!persisted) return false;
      const { tabs, activeTabId } = persisted;
      set({
        tabs,
        activeTabId,
        selectedNodeId: null,
        editingNodeId: null,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        ...getDerivedState(tabs, activeTabId),
      });
      return true;
    },

    clearLocal: () => {
      localStorage.removeItem(STORAGE_KEY);
    },

    generateShareLink: () => {
      const { tabs, activeTabId } = get();
      const tab = getActiveTab(tabs, activeTabId);
      if (!tab) return '';
      const hash = encodeToHash({ name: tab.name, rootNodeId: tab.rootNodeId, nodes: tab.nodes, layout: tab.layout });
      writeHashToURL(hash);
      return `${window.location.origin}${window.location.pathname}#mindmap=${hash}`;
    },

    loadFromHash: () => {
      const hash = readHashFromURL();
      if (!hash) return false;
      const decoded = decodeFromHash(hash);
      if (!decoded) return false;
      get().loadFromData(decoded);
      return true;
    },

    importXMindSheets: (sheets) => {
      const { tabs } = get();
      const newTabs = sheets.map(sheet => {
        const layout = 'mindmap-right' as LayoutType;
        const nodes = calculateTreeLayout(sheet.nodes, sheet.rootNodeId, layout);
        const snapshot = createSnapshot({
          name: sheet.name,
          rootNodeId: sheet.rootNodeId,
          nodes,
          layout,
          theme: 'default',
        });
        return {
          id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: sheet.name,
          rootNodeId: sheet.rootNodeId,
          nodes,
          layout,
          theme: 'default' as ThemeType,
          saveStatus: 'unsaved' as const,
          lastSavedAt: null,
          history: [snapshot],
          historyIndex: 0,
        };
      });

      const updatedTabs = [...tabs, ...newTabs];
      const firstNewTabId = newTabs[0].id;

      set({
        tabs: updatedTabs,
        activeTabId: firstNewTabId,
        selectedNodeId: null,
        editingNodeId: null,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        ...getDerivedState(updatedTabs, firstNewTabId),
      });
      clearHashFromURL();
      saveAllTabs(updatedTabs, firstNewTabId);
    },
  };
});
