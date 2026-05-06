import type { RichTextSegment } from '@/types';

/**
 * 简单的 Markdown 内联语法解析器
 * 支持: **粗体**, *斜体*, `代码`, [链接](url), ![图片](url)
 */
export function parseMarkdown(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let remaining = text;

  // 正则匹配模式（按优先级排序）
  const patterns = [
    { type: 'image' as const, regex: /!\[([^\]]*)\]\(([^)]+)\)/ },
    { type: 'link' as const, regex: /\[([^\]]+)\]\(([^)]+)\)/ },
    { type: 'code' as const, regex: /`([^`]+)`/ },
    { type: 'bold' as const, regex: /\*\*([^*]+)\*\*/ },
    { type: 'italic' as const, regex: /\*([^*]+)\*/ },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; type: string; content: string; url?: string } | null = null;

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && (earliestMatch === null || (match.index !== undefined && match.index < earliestMatch.index))) {
        earliestMatch = {
          index: match.index!,
          length: match[0].length,
          type: pattern.type,
          content: match[1],
          url: match[2],
        };
      }
    }

    if (earliestMatch) {
      // 添加匹配前的普通文本
      if (earliestMatch.index > 0) {
        segments.push({ type: 'text', content: remaining.slice(0, earliestMatch.index) });
      }
      // 添加匹配的富文本片段
      segments.push({
        type: earliestMatch.type as RichTextSegment['type'],
        content: earliestMatch.content,
        url: earliestMatch.url,
      });
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      // 没有更多匹配，剩余全部作为普通文本
      if (remaining) {
        segments.push({ type: 'text', content: remaining });
      }
      break;
    }
  }

  return segments;
}

/**
 * 将富文本片段渲染为 React 元素
 */
export function renderRichText(segments: RichTextSegment[]): React.ReactNode[] {
  return segments.map((seg, i) => {
    switch (seg.type) {
      case 'bold':
        return <strong key={i} className="font-bold">{seg.content}</strong>;
      case 'italic':
        return <em key={i} className="italic">{seg.content}</em>;
      case 'code':
        return (
          <code key={i} className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono text-red-600">
            {seg.content}
          </code>
        );
      case 'link':
        return (
          <a
            key={i}
            href={seg.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline hover:text-primary-800"
            onClick={(e) => e.stopPropagation()}
          >
            {seg.content}
          </a>
        );
      case 'image':
        return (
          <img
            key={i}
            src={seg.url}
            alt={seg.content}
            className="inline-block max-w-[80px] max-h-[40px] rounded object-contain align-middle"
            onClick={(e) => e.stopPropagation()}
          />
        );
      default:
        return <span key={i}>{seg.content}</span>;
    }
  });
}
