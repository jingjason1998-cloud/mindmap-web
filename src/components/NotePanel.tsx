import { useState, useEffect, useCallback } from 'react';
import { useMindMapStore } from '@/stores/mindMapStore';
import { X, StickyNote, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

export function NotePanel() {
  const { selectedNodeId, nodes } = useMindMapStore();
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  useEffect(() => {
    if (selectedNode) {
      setIsOpen(true);
      setNote(selectedNode.data?.note || '');
      setLink(selectedNode.data?.link || '');
      setImageUrl(selectedNode.data?.image || '');
    }
  }, [selectedNodeId]);

  const handleSave = useCallback(() => {
    if (!selectedNodeId) return;
    const node = nodes[selectedNodeId];
    if (!node) return;

    const updated = {
      ...nodes,
      [selectedNodeId]: {
        ...node,
        data: {
          ...node.data,
          note: note || undefined,
          link: link || undefined,
          image: imageUrl || undefined,
        },
      },
    };
    useMindMapStore.setState({ nodes: updated });
  }, [selectedNodeId, nodes, note, link, imageUrl]);

  // 自动保存（debounce）
  useEffect(() => {
    if (!selectedNodeId) return;
    const timer = setTimeout(handleSave, 500);
    return () => clearTimeout(timer);
  }, [note, link, imageUrl, handleSave, selectedNodeId]);

  if (!isOpen || !selectedNode) return null;

  return (
    <div className="absolute right-4 top-20 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-semibold text-gray-800">节点详情</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Node text preview */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">节点文本</label>
          <div className="mt-1.5 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
            {selectedNode.text}
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <StickyNote className="w-3 h-3" />
            备注
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="添加备注..."
            className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
            rows={4}
          />
        </div>

        {/* Link */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            链接
          </label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
          />
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-xs text-primary-600 hover:underline inline-block"
            >
              打开链接 →
            </a>
          )}
        </div>

        {/* Image */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            图片 URL
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="图片地址..."
            className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="节点图片"
              className="mt-2 w-full h-32 object-contain rounded-lg bg-gray-50"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>

        {/* Markdown hint */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            节点文本支持 Markdown:<br />
            **粗体** *斜体* `代码`<br />
            [链接](url) ![图片](url)
          </p>
        </div>
      </div>
    </div>
  );
}
