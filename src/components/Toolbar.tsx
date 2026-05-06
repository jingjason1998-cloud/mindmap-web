import { useCallback, useEffect, useRef, useState } from 'react';
import { useMindMapStore } from '@/stores/mindMapStore';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Layout,
  Download,
  Upload,
  FileJson,
  FileText,
  Image,
  Grid3X3,
  ChevronDown,
  Save,
  Check,
  Loader2,
  Share2,
  FileType2,
  Undo2,
  Redo2,
  LogOut,
  FolderOpen,
} from 'lucide-react';
import type { LayoutType, MindNode, ThemeType } from '@/types';
import {
  exportToJSON,
  importFromJSON,
  downloadJSON,
  exportToMarkdown,
  importFromMarkdown,
  downloadMarkdown,
  exportToPNG,
} from '@/utils/exportImport';
import { importFromXMind } from '@/utils/xmindImport';
import { downloadXMind } from '@/utils/xmindExport';
import { saveOrUpdateToLibrary } from '@/stores/fileLibrary';
import { logout } from '@/components/Login';

const layouts: { value: LayoutType; label: string }[] = [
  { value: 'mindmap-right', label: '思维导图 (右)' },
  { value: 'mindmap-left', label: '思维导图 (左)' },
  { value: 'mindmap-both', label: '思维导图 (双向)' },
  { value: 'org-down', label: '组织结构 (下)' },
  { value: 'org-up', label: '组织结构 (上)' },
  { value: 'logic-right', label: '逻辑图 (右)' },
  { value: 'logic-left', label: '逻辑图 (左)' },
];

interface ToolbarProps {
  onToggleShare?: () => void;
  onToggleFileManager?: () => void;
}

export function Toolbar({ onToggleShare, onToggleFileManager }: ToolbarProps) {
  const {
    name,
    layout,
    scale,
    saveStatus,
    lastSavedAt,
    setName,
    setLayout,
    zoomIn,
    zoomOut,
    resetView,
    undo,
    redo,
    canUndo,
    canRedo,
    initialize,
    addChild,
    addSibling,
    deleteNode,
    nodes,
    rootNodeId,
    loadFromData,
    importXMindSheets,
    tabs,
  } = useMindMapStore();

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    canvasRef.current = document.querySelector('[data-canvas="mindmap"]') as HTMLDivElement;
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLayoutChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setLayout(e.target.value as LayoutType);
  }, [setLayout]);

  // 保存状态提示文本
  const saveHint = useCallback(() => {
    if (saveStatus === 'saving') return '保存中...';
    if (saveStatus === 'saved' && lastSavedAt) {
      const date = new Date(lastSavedAt);
      const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      return `已保存 ${timeStr}`;
    }
    return '未保存';
  }, [saveStatus, lastSavedAt]);

  // 导出功能
  const handleExportJSON = useCallback(() => {
    const json = exportToJSON({ name, layout, theme: 'default', rootNodeId, nodes });
    downloadJSON(json, name);
    setExportMenuOpen(false);
  }, [name, layout, rootNodeId, nodes]);

  const handleExportMarkdown = useCallback(() => {
    const md = exportToMarkdown(nodes, rootNodeId);
    downloadMarkdown(md, name);
    setExportMenuOpen(false);
  }, [nodes, rootNodeId, name]);

  const handleExportPNG = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await exportToPNG(canvas, name);
    setExportMenuOpen(false);
  }, [name]);

  const handleExportXMind = useCallback(async () => {
    const sheets = tabs.map(tab => ({
      name: tab.name,
      rootNodeId: tab.rootNodeId,
      nodes: tab.nodes,
    }));
    await downloadXMind(name, sheets);
    setExportMenuOpen(false);
  }, [name, tabs]);

  // 导入功能
  const handleImportClick = useCallback((type: 'json' | 'markdown' | 'xmind') => {
    if (!fileInputRef.current) return;
    fileInputRef.current.dataset.importType = type;
    if (type === 'json') {
      fileInputRef.current.accept = '.json';
    } else if (type === 'markdown') {
      fileInputRef.current.accept = '.md,.markdown';
    } else if (type === 'xmind') {
      fileInputRef.current.accept = '.xmind';
    }
    fileInputRef.current.click();
    setImportMenuOpen(false);
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'info' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSaveToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setSaveToast(null), 2500);
  }, []);

  // 监听 toast 事件（用于快捷键触发的保存提示）
  useEffect(() => {
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent).detail as { msg: string; type: 'success' | 'info' };
      if (detail) showToast(detail.msg, detail.type);
    };
    window.addEventListener('mindmap-toast', handleToast);
    return () => window.removeEventListener('mindmap-toast', handleToast);
  }, [showToast]);

  const autoSaveToLibrary = useCallback((data: {
    name: string;
    rootNodeId: string;
    nodes: Record<string, MindNode>;
    layout: LayoutType;
    theme: ThemeType;
  }) => {
    const { isUpdate, error } = saveOrUpdateToLibrary(data);
    if (error) {
      showToast(error, 'info');
    } else {
      showToast(isUpdate ? `已更新文件库「${data.name}」` : `已保存到文件库「${data.name}」`, 'success');
      window.dispatchEvent(new CustomEvent('file-library-updated'));
    }
  }, [showToast]);

  const handleSaveToLibrary = useCallback(() => {
    const state = useMindMapStore.getState();
    const { name, rootNodeId, nodes, layout, theme } = state;
    if (!rootNodeId || Object.keys(nodes).length === 0) {
      showToast('当前没有可保存的思维导图数据', 'info');
      return;
    }
    const { isUpdate, error } = saveOrUpdateToLibrary({ name, rootNodeId, nodes, layout, theme });
    if (error) {
      showToast(error, 'info');
    } else {
      showToast(isUpdate ? `已更新文件库「${name}」` : `已保存到文件库「${name}」`, 'success');
      window.dispatchEvent(new CustomEvent('file-library-updated'));
    }
  }, [showToast]);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = fileInputRef.current?.dataset.importType;

    if (type === 'json') {
      const text = await file.text();
      const data = importFromJSON(text);
      if (data && data.nodes && data.rootNodeId) {
        const fileName = data.name || file.name.replace(/\.json$/, '');
        loadFromData({
          nodes: data.nodes,
          rootNodeId: data.rootNodeId,
          layout: data.layout,
          theme: data.theme,
          name: fileName,
        });
        autoSaveToLibrary({
          name: fileName,
          rootNodeId: data.rootNodeId,
          nodes: data.nodes,
          layout: data.layout || 'mindmap-right',
          theme: data.theme || 'default',
        });
      } else {
        alert('无效的 JSON 文件');
      }
    } else if (type === 'markdown') {
      const text = await file.text();
      const result = importFromMarkdown(text);
      if (result) {
        const fileName = file.name.replace(/\.md$/, '');
        loadFromData({
          nodes: result.nodes,
          rootNodeId: result.rootId,
          name: fileName,
        });
        autoSaveToLibrary({
          name: fileName,
          rootNodeId: result.rootId,
          nodes: result.nodes,
          layout: 'mindmap-right',
          theme: 'default',
        });
      } else {
        alert('无效的 Markdown 文件');
      }
    } else if (type === 'xmind') {
      const result = await importFromXMind(file);
      if (result && result.sheets.length > 0) {
        importXMindSheets(result.sheets);
        result.sheets.forEach((sheet, idx) => {
          setTimeout(() => {
            autoSaveToLibrary({
              name: sheet.name || `${file.name.replace(/\.xmind$/, '')} ${idx + 1}`,
              rootNodeId: sheet.rootNodeId,
              nodes: sheet.nodes,
              layout: 'mindmap-right',
              theme: 'default',
            });
          }, idx * 100);
        });
      } else {
        alert('无法解析 XMind 文件，请确保文件格式正确');
      }
    }

    e.target.value = '';
  }, [loadFromData, importXMindSheets, autoSaveToLibrary]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (useMindMapStore.getState().editingNodeId) return;
      const { selectedNodeId } = useMindMapStore.getState();

      // Ctrl+S 保存到文件库
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const state = useMindMapStore.getState();
        const { name, rootNodeId, nodes, layout, theme } = state;
        if (rootNodeId && Object.keys(nodes).length > 0) {
          const { isUpdate } = saveOrUpdateToLibrary({ name, rootNodeId, nodes, layout, theme });
          const toastMsg = isUpdate ? `已更新文件库「${name}」` : `已保存到文件库「${name}」`;
          // 通过触发一个自定义事件来显示 toast
          window.dispatchEvent(new CustomEvent('mindmap-toast', { detail: { msg: toastMsg, type: 'success' } }));
        }
        return;
      }

      // Ctrl+Z 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useMindMapStore.getState().undo();
        return;
      }

      // Ctrl+Shift+Z / Ctrl+Y 重做
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        useMindMapStore.getState().redo();
        return;
      }

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          if (selectedNodeId) addChild(selectedNodeId);
          break;
        case 'Enter':
          if (selectedNodeId) addSibling(selectedNodeId);
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedNodeId) {
            const node = nodes[selectedNodeId];
            if (node?.parentId) deleteNode(selectedNodeId);
          }
          break;
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetView();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addChild, addSibling, deleteNode, zoomIn, zoomOut, resetView, nodes]);

  return (
    <>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

      {/* Top Toolbar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 z-30 shadow-sm flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Grid3X3 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-800">MindMap</span>
        </div>

        {/* Document name */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-transparent rounded-md hover:border-gray-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
        />

        {/* Save status */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            saveStatus === 'saved'
              ? 'bg-green-50 text-green-700'
              : saveStatus === 'saving'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-gray-100 text-gray-500'
          }`}
          title="自动保存到浏览器本地存储"
        >
          {saveStatus === 'saved' ? (
            <Check className="w-3.5 h-3.5" />
          ) : saveStatus === 'saving' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{saveHint()}</span>
        </div>

        {/* Layout selector */}
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-gray-400" />
          <select
            value={layout}
            onChange={handleLayoutChange}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 bg-white"
          >
            {layouts.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="撤销 (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="重做 (Ctrl+Shift+Z / Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors" title="缩小 (Ctrl+-)">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors" title="放大 (Ctrl++)">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={resetView} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors" title="重置视图 (Ctrl+0)">
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Import dropdown */}
        <div className="relative" ref={importMenuRef}>
          <button
            onClick={() => setImportMenuOpen(!importMenuOpen)}
            className="px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            导入
            <ChevronDown className="w-3 h-3" />
          </button>
          {importMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button onClick={() => handleImportClick('json')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-blue-500" /> 导入 JSON
              </button>
              <button onClick={() => handleImportClick('markdown')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" /> 导入 Markdown
              </button>
              <button onClick={() => handleImportClick('xmind')} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FileType2 className="w-4 h-4 text-orange-500" /> 导入 XMind
              </button>
            </div>
          )}
        </div>

        {/* Export dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            导出
            <ChevronDown className="w-3 h-3" />
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button onClick={handleExportJSON} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-blue-500" /> 导出 JSON
              </button>
              <button onClick={handleExportMarkdown} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" /> 导出 Markdown
              </button>
              <button onClick={handleExportXMind} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <FileType2 className="w-4 h-4 text-orange-500" /> 导出 XMind
              </button>
              <button onClick={handleExportPNG} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <Image className="w-4 h-4 text-green-500" /> 导出 PNG
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onToggleShare}
          className="px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <Share2 className="w-4 h-4" />
          分享
        </button>

        <button
          onClick={handleSaveToLibrary}
          className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          保存
        </button>

        <button
          onClick={onToggleFileManager}
          className="px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <FolderOpen className="w-4 h-4" />
          文件库
        </button>

        <button onClick={initialize} className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors">
          新建
        </button>

        <div className="w-px h-6 bg-gray-200" />

        {/* 用户 / 退出 */}
        <button
          onClick={logout}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
          title="退出登录"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom hint bar */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-white/80 backdrop-blur border-t border-gray-200 flex items-center justify-center gap-4 text-xs text-gray-400 z-20">
        <span>双击编辑</span>
        <span>·</span>
        <span>Tab 添加子节点</span>
        <span>·</span>
        <span>Enter 添加同级节点</span>
        <span>·</span>
        <span>滚轮缩放 / 拖拽平移</span>
        <span>·</span>
        <span>Ctrl+S 保存</span>
        <span>·</span>
        <span>Delete 删除</span>
      </div>

      {/* Save Toast */}
      {saveToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            saveToast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-white'
          }`}>
            {saveToast.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saveToast.msg}
          </div>
        </div>
      )}
    </>
  );
}
