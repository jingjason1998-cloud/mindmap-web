import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  X,
  FolderOpen,
  Search,
  Save,
  Trash2,
  FileJson,
  FileText,
  LayoutGrid,
  Calendar,
  Network,
  ChevronRight,
  Copy,
  ArrowUpDown,
  CheckSquare,
  Square,
  AlertTriangle,
  Upload,
  Download,
} from 'lucide-react';
import { useMindMapStore } from '@/stores/mindMapStore';
import {
  getLibrary,
  saveToLibrary,
  deleteFromLibrary,
  renameInLibrary,
  duplicateInLibrary,
  exportLibraryToJSON,
  importLibraryFromJSON,
  type FileRecord,
} from '@/stores/fileLibrary';
import { downloadJSON } from '@/utils/exportImport';
import type { LayoutType } from '@/types';

interface FileManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortKey = 'updatedAt-desc' | 'updatedAt-asc' | 'createdAt-desc' | 'createdAt-asc' | 'name-asc' | 'name-desc';

const layoutLabels: Record<LayoutType, string> = {
  'mindmap-right': '思维导图',
  'mindmap-left': '思维导图(左)',
  'mindmap-both': '思维导图(双向)',
  'org-down': '组织结构',
  'org-up': '组织结构(上)',
  'logic-right': '逻辑图',
  'logic-left': '逻辑图(左)',
};

const sortLabels: Record<SortKey, string> = {
  'updatedAt-desc': '最近更新',
  'updatedAt-asc': '最早更新',
  'createdAt-desc': '最近创建',
  'createdAt-asc': '最早创建',
  'name-asc': '名称 A-Z',
  'name-desc': '名称 Z-A',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function countNodes(nodes: Record<string, unknown>): number {
  return Object.keys(nodes).length;
}

export function FileManager({ isOpen, onClose }: FileManagerProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt-desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [importToast, setImportToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { tabs, activeTabId, switchTab, loadFromData } = useMindMapStore();

  const refresh = useCallback(() => {
    setFiles(getLibrary());
  }, []);

  useEffect(() => {
    if (isOpen) {
      refresh();
      setBatchMode(false);
      setSelectedIds(new Set());
      setShowBatchDeleteConfirm(false);
    }
  }, [isOpen, refresh]);

  // 监听外部保存到文件库的事件，实时刷新列表
  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener('file-library-updated', handleUpdate);
    return () => window.removeEventListener('file-library-updated', handleUpdate);
  }, [refresh]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const sortedAndFilteredFiles = useMemo(() => {
    let result = [...files];

    // 搜索过滤
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    // 排序
    const [field, dir] = sortKey.split('-') as [keyof FileRecord, 'asc' | 'desc'];
    result.sort((a, b) => {
      const av = a[field] as string | number;
      const bv = b[field] as string | number;
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [files, search, sortKey]);

  const allSelected = sortedAndFilteredFiles.length > 0 && sortedAndFilteredFiles.every(f => selectedIds.has(f.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        sortedAndFilteredFiles.forEach(f => next.delete(f.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        sortedAndFilteredFiles.forEach(f => next.add(f.id));
        return next;
      });
    }
  }, [allSelected, sortedAndFilteredFiles]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSaveCurrent = useCallback(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;
    saveToLibrary({
      name: activeTab.name,
      rootNodeId: activeTab.rootNodeId,
      nodes: activeTab.nodes,
      layout: activeTab.layout,
      theme: activeTab.theme,
    });
    window.dispatchEvent(new CustomEvent('file-library-updated'));
  }, [tabs, activeTabId]);

  const handleOpenFile = useCallback((file: FileRecord) => {
    const existing = tabs.find(t => t.name === file.name);
    if (existing) {
      switchTab(existing.id);
    } else {
      loadFromData({
        nodes: JSON.parse(JSON.stringify(file.nodes)),
        rootNodeId: file.rootNodeId,
        layout: file.layout,
        theme: file.theme,
        name: file.name,
      });
    }
    onClose();
  }, [tabs, switchTab, loadFromData, onClose]);

  const handleDelete = useCallback((id: string) => {
    deleteFromLibrary(id);
    setDeleteConfirmId(null);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    refresh();
  }, [refresh]);

  const handleBatchDelete = useCallback(() => {
    selectedIds.forEach(id => deleteFromLibrary(id));
    setSelectedIds(new Set());
    setShowBatchDeleteConfirm(false);
    setBatchMode(false);
    refresh();
  }, [selectedIds, refresh]);

  const handleRename = useCallback((id: string) => {
    if (editName.trim()) {
      renameInLibrary(id, editName.trim());
    }
    setEditingId(null);
    refresh();
  }, [editName, refresh]);

  const handleDuplicate = useCallback((id: string) => {
    const result = duplicateInLibrary(id);
    if (result.error) {
      setImportToast(result.error);
      setTimeout(() => setImportToast(null), 3000);
    }
    refresh();
  }, [refresh]);

  const handleExportFile = useCallback((file: FileRecord) => {
    downloadJSON(
      JSON.stringify({
        name: file.name,
        rootNodeId: file.rootNodeId,
        nodes: file.nodes,
        layout: file.layout,
        theme: file.theme,
      }, null, 2),
      `${file.name}.json`
    );
  }, []);

  const handleExportAll = useCallback(() => {
    const json = exportLibraryToJSON();
    downloadJSON(json, 'mindmap-文件库.json');
  }, []);

  const handleImportLibrary = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = importLibraryFromJSON(text);
      if (result.error) {
        setImportToast(result.error);
      } else if (result.count === 0) {
        setImportToast('文件库中已存在这些文件，未重复导入');
      } else {
        setImportToast(`成功导入 ${result.count} 个文件`);
      }
      refresh();
    } catch {
      setImportToast('导入失败，请检查文件格式');
    }
    e.target.value = '';
    setTimeout(() => setImportToast(null), 5000);
  }, [refresh]);

  const startRename = useCallback((file: FileRecord) => {
    setEditingId(file.id);
    setEditName(file.name);
  }, []);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-[420px] max-w-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-gray-800">文件库</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {files.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 space-y-3 border-b border-gray-100">
          {/* Search + Sort */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索文件..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="appearance-none pl-3 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 cursor-pointer"
                title="排序"
              >
                {Object.entries(sortLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Save + Batch mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={handleSaveCurrent}
              className="flex-1 py-2 px-3 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存当前到文件库
            </button>
            <button
              onClick={() => {
                setBatchMode(v => !v);
                setSelectedIds(new Set());
                setShowBatchDeleteConfirm(false);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                batchMode
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {batchMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              批量
            </button>
          </div>

          {/* Export / Import library */}
          <div className="flex gap-2">
            <button
              onClick={handleExportAll}
              disabled={files.length === 0}
              className="flex-1 py-2 px-3 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出全部
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              导入文件库
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportLibrary}
            />
          </div>

          {/* Import / operation toast */}
          {importToast && (
            <div className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
              importToast.startsWith('成功') || importToast.startsWith('已')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {importToast.startsWith('成功') || importToast.startsWith('已') ? (
                <CheckSquare className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              {importToast}
            </div>
          )}

          {/* Local storage hint */}
          <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 leading-relaxed">
              <span className="font-semibold">数据仅保存在当前浏览器中。</span>
              换电脑/清缓存会丢失。如需跨设备使用，请点击「导出全部」备份，在另一台电脑「导入文件库」恢复。
            </div>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {sortedAndFilteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FolderOpen className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm">
                {search.trim() ? '未找到匹配的文件' : '文件库为空'}
              </p>
              <p className="text-xs mt-1 max-w-[280px] text-center leading-relaxed">
                {search.trim()
                  ? '尝试其他关键词'
                  : '点击「保存当前到文件库」把思维导图存进来，或「导入文件库」恢复备份'}
              </p>
            </div>
          ) : (
            sortedAndFilteredFiles.map((file) => (
              <div
                key={file.id}
                className={`group relative p-3 rounded-xl border transition-all bg-white ${
                  selectedIds.has(file.id)
                    ? 'border-primary-400 shadow-md ring-1 ring-primary-100'
                    : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left: checkbox + info */}
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {batchMode && (
                      <button
                        onClick={() => toggleSelect(file.id)}
                        className={`mt-0.5 p-0.5 rounded border transition-colors flex-shrink-0 ${
                          selectedIds.has(file.id)
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-gray-300 text-transparent hover:border-primary-400'
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      {editingId === file.id ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleRename(file.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(file.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full text-sm font-semibold text-gray-800 bg-gray-50 border border-primary-300 rounded px-2 py-1 outline-none"
                        />
                      ) : (
                        <h3
                          className="text-sm font-semibold text-gray-800 truncate cursor-pointer hover:text-primary-600 transition-colors"
                          onClick={() => !batchMode && startRename(file)}
                          title={batchMode ? file.name : '点击重命名'}
                        >
                          {file.name}
                        </h3>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                          <LayoutGrid className="w-3 h-3" />
                          {layoutLabels[file.layout]}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                          <Network className="w-3 h-3" />
                          {countNodes(file.nodes)} 节点
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{formatTime(file.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!batchMode && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => handleOpenFile(file)}
                        className="p-1.5 rounded-md hover:bg-primary-50 text-primary-600 transition-colors"
                        title="打开"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(file.id)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                        title="复制"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExportFile(file)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                        title="导出 JSON"
                      >
                        <FileJson className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startRename(file)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                        title="重命名"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(file.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Single delete confirmation */}
                {!batchMode && deleteConfirmId === file.id && (
                  <div className="mt-2 p-2 bg-red-50 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-red-600">确定删除此文件？</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 text-xs text-gray-600 hover:bg-white rounded transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Batch action bar */}
        {batchMode && (
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
            {showBatchDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">确定删除选中的 {selectedIds.size} 个文件？</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBatchDeleteConfirm(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {allSelected ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4" />}
                  全选 ({selectedIds.size}/{sortedAndFilteredFiles.length})
                </button>
                <button
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  disabled={selectedIds.size === 0}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  删除 ({selectedIds.size})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        {!batchMode && (
          <div className="px-5 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-400 text-center">
              文件库存储在浏览器本地，清空浏览器数据将丢失
            </p>
          </div>
        )}
      </div>
    </>
  );
}
