import { useRef, useState } from 'react';
import { useMindMapStore } from '@/stores/mindMapStore';
import { Plus, X } from 'lucide-react';

export function TabBar() {
  const { tabs, activeTabId, newTab, closeTab, switchTab, renameTab } = useMindMapStore();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (tabId: string, name: string) => {
    setEditingTabId(tabId);
    setEditName(name);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleBlur = () => {
    if (editingTabId && editName.trim()) {
      renameTab(editingTabId, editName.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <div className="flex items-center h-9 bg-gray-100 border-b border-gray-200 px-2 gap-1 overflow-x-auto no-scrollbar">
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`
              group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-sm cursor-pointer
              transition-all select-none min-w-[80px] max-w-[180px]
              ${isActive
                ? 'bg-white text-gray-900 border-t border-l border-r border-gray-200 shadow-sm'
                : 'bg-transparent text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }
            `}
            onClick={() => switchTab(tab.id)}
          >
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-sm bg-white border border-primary-300 rounded px-1 outline-none"
              />
            ) : (
              <>
                <span
                  className="truncate flex-1"
                  onDoubleClick={() => handleDoubleClick(tab.id, tab.name)}
                  title={tab.name}
                >
                  {tab.name}
                </span>
                {tab.saveStatus === 'unsaved' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" title="未保存" />
                )}
              </>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={`
                p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0
                ${isActive ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-600' : 'hover:bg-gray-300 text-gray-400 hover:text-gray-600'}
              `}
              title="关闭标签页"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      <button
        onClick={newTab}
        className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors flex-shrink-0 ml-1"
        title="新建标签页"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
