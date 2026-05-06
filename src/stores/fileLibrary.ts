import type { MindNode, LayoutType, ThemeType } from '@/types';

const LIBRARY_KEY = 'mindmap-file-library';

export interface FileRecord {
  id: string;
  name: string;
  rootNodeId: string;
  nodes: Record<string, MindNode>;
  layout: LayoutType;
  theme: ThemeType;
  createdAt: number;
  updatedAt: number;
}

function loadLibrary(): FileRecord[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLibrary(files: FileRecord[]): { success: boolean; error?: string } {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(files));
    return { success: true };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      return { success: false, error: '存储空间已满，请删除一些文件后再保存' };
    }
    return { success: false, error: '保存失败，浏览器存储异常' };
  }
}

// ========================
// 文件库 CRUD
// ========================

export function getLibrary(): FileRecord[] {
  return loadLibrary();
}

export function saveToLibrary(data: {
  name: string;
  rootNodeId: string;
  nodes: Record<string, MindNode>;
  layout: LayoutType;
  theme: ThemeType;
}): { id: string; error?: string } {
  const files = loadLibrary();
  const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const now = Date.now();
  const record: FileRecord = {
    id,
    name: data.name || '未命名思维导图',
    rootNodeId: data.rootNodeId,
    nodes: JSON.parse(JSON.stringify(data.nodes)),
    layout: data.layout,
    theme: data.theme,
    createdAt: now,
    updatedAt: now,
  };
  files.unshift(record);
  const result = saveLibrary(files);
  if (!result.success) return { id, error: result.error };
  return { id };
}

export function updateInLibrary(id: string, updates: Partial<Omit<FileRecord, 'id' | 'createdAt'>>): { success: boolean; error?: string } {
  const files = loadLibrary();
  const idx = files.findIndex(f => f.id === id);
  if (idx === -1) return { success: false, error: '文件不存在' };
  files[idx] = { ...files[idx], ...updates, updatedAt: Date.now() };
  const result = saveLibrary(files);
  return { success: result.success, error: result.error };
}

export function deleteFromLibrary(id: string): boolean {
  const files = loadLibrary();
  const filtered = files.filter(f => f.id !== id);
  if (filtered.length === files.length) return false;
  saveLibrary(filtered);
  return true;
}

export function renameInLibrary(id: string, name: string): { success: boolean; error?: string } {
  return updateInLibrary(id, { name: name.trim() || '未命名思维导图' });
}

export function getFileById(id: string): FileRecord | null {
  return loadLibrary().find(f => f.id === id) || null;
}

export function duplicateInLibrary(id: string): { id: string | null; error?: string } {
  const files = loadLibrary();
  const source = files.find(f => f.id === id);
  if (!source) return { id: null, error: '文件不存在' };
  const newId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const now = Date.now();
  const copy: FileRecord = {
    ...source,
    id: newId,
    name: `${source.name} 副本`,
    nodes: JSON.parse(JSON.stringify(source.nodes)),
    createdAt: now,
    updatedAt: now,
  };
  files.unshift(copy);
  const result = saveLibrary(files);
  if (!result.success) return { id: null, error: result.error };
  return { id: newId };
}

/**
 * 保存或更新到文件库：同名则覆盖更新，不同名则新建
 * 返回 { id, isUpdate, error? }
 */
export function saveOrUpdateToLibrary(data: {
  name: string;
  rootNodeId: string;
  nodes: Record<string, MindNode>;
  layout: LayoutType;
  theme: ThemeType;
}): { id: string; isUpdate: boolean; error?: string } {
  const files = loadLibrary();
  const existing = files.find(f => f.name === (data.name || '未命名思维导图'));

  if (existing) {
    // 覆盖更新
    existing.rootNodeId = data.rootNodeId;
    existing.nodes = JSON.parse(JSON.stringify(data.nodes));
    existing.layout = data.layout;
    existing.theme = data.theme;
    existing.updatedAt = Date.now();
    const result = saveLibrary(files);
    if (!result.success) return { id: existing.id, isUpdate: true, error: result.error };
    return { id: existing.id, isUpdate: true };
  }

  // 新建
  const { id, error } = saveToLibrary(data);
  return { id, isUpdate: false, error };
}

export function exportLibraryToJSON(): string {
  return JSON.stringify(loadLibrary(), null, 2);
}

export function importLibraryFromJSON(jsonString: string): { count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);

    // 检测是否是单个思维导图文件（用户可能误用了单个文件的导出）
    if (!Array.isArray(parsed)) {
      if (parsed && typeof parsed.name === 'string' && parsed.nodes && typeof parsed.rootNodeId === 'string') {
        return { count: 0, error: '检测到单个思维导图文件，请使用工具栏「导入」按钮导入，或先将其添加到文件库后再导出全部' };
      }
      return { count: 0, error: '格式错误：不是文件列表' };
    }

    const validFiles = parsed.filter((item: unknown) => {
      const f = item as Partial<FileRecord>;
      return f && typeof f.id === 'string' && typeof f.name === 'string' && f.nodes && typeof f.rootNodeId === 'string';
    }) as FileRecord[];

    if (validFiles.length === 0) return { count: 0, error: '未找到有效的思维导图文件' };

    const existing = loadLibrary();
    const existingIds = new Set(existing.map(f => f.id));
    const existingNames = new Set(existing.map(f => f.name));

    let added = 0;
    validFiles.forEach(file => {
      if (existingIds.has(file.id)) return; // 跳过重复 ID
      let name = file.name;
      // 同名则加后缀
      if (existingNames.has(name)) {
        let suffix = 1;
        while (existingNames.has(`${name} (${suffix})`)) suffix++;
        name = `${name} (${suffix})`;
      }
      existingNames.add(name);
      existing.push({ ...file, name, updatedAt: Date.now() });
      added++;
    });

    const result = saveLibrary(existing);
    if (!result.success) return { count: added, error: result.error };
    return { count: added };
  } catch {
    return { count: 0, error: '解析失败，请检查 JSON 文件格式' };
  }
}
