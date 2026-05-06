import { describe, it, expect } from 'vitest'
import {
  exportToJSON,
  importFromJSON,
  exportToMarkdown,
  importFromMarkdown,
} from '../utils/exportImport'
import { createInitialMindMap, calculateTreeLayout } from '../utils/treeLayout'

describe('Export/Import', () => {
  it('should export and import JSON correctly', () => {
    const nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id
    const state = {
      name: '测试导图',
      layout: 'mindmap-right' as const,
      theme: 'default' as const,
      rootNodeId: rootId,
      nodes,
    }

    const json = exportToJSON(state)
    expect(json).toContain('测试导图')
    expect(json).toContain(rootId)

    const imported = importFromJSON(json)
    expect(imported).not.toBeNull()
    expect(imported!.name).toBe('测试导图')
    expect(imported!.rootNodeId).toBe(rootId)
    expect(Object.keys(imported!.nodes).length).toBe(Object.keys(nodes).length)
  })

  it('should handle invalid JSON import', () => {
    expect(importFromJSON('not json')).toBeNull()
    expect(importFromJSON('{}')).toBeNull()
  })

  it('should export to Markdown correctly', () => {
    const nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id
    const md = exportToMarkdown(nodes, rootId)

    expect(md).toContain('- 中心主题')
    expect(md).toContain('- 分支主题 1')
  })

  it('should import from Markdown correctly', () => {
    const md = `- 根节点
  - 子节点1
  - 子节点2
    - 孙节点`

    const result = importFromMarkdown(md)
    expect(result).not.toBeNull()
    expect(Object.keys(result!.nodes).length).toBe(4)

    const root = Object.values(result!.nodes).find(n => n.parentId === null)
    expect(root!.text).toBe('根节点')
  })

  it('should handle empty Markdown import', () => {
    expect(importFromMarkdown('')).toBeNull()
    expect(importFromMarkdown('just text')).toBeNull()
  })
})
