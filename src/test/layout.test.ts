import { describe, it, expect } from 'vitest'
import {
  createInitialMindMap,
  calculateTreeLayout,
  addChildNode,
  addSiblingNode,
  deleteNode,
} from '../utils/treeLayout'
import type { LayoutType } from '../types'

describe('Tree Layout', () => {
  it('should create initial mind map with root node', () => {
    const nodes = createInitialMindMap()
    const root = Object.values(nodes).find(n => n.parentId === null)
    expect(root).toBeDefined()
    expect(root!.text).toBe('中心主题')
  })

  it('should calculate mindmap-right layout correctly', () => {
    const nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id
    const laidOut = calculateTreeLayout(nodes, rootId, 'mindmap-right')

    const root = laidOut[rootId]
    expect(root.x).toBe(0)
    expect(root.y).toBe(0)

    // 子节点应该在根节点的右侧
    root.children.forEach(childId => {
      const child = laidOut[childId]
      expect(child.x).toBeGreaterThan(root.x)
    })
  })

  it('should calculate mindmap-left layout correctly', () => {
    const nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id
    const laidOut = calculateTreeLayout(nodes, rootId, 'mindmap-left')

    const root = laidOut[rootId]
    // 子节点应该在根节点的左侧
    root.children.forEach(childId => {
      const child = laidOut[childId]
      expect(child.x).toBeLessThan(root.x)
    })
  })

  it('should calculate mindmap-both layout correctly', () => {
    const nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id
    const laidOut = calculateTreeLayout(nodes, rootId, 'mindmap-both')

    const root = laidOut[rootId]
    expect(root.x).toBe(0)

    const leftChildren = root.children.filter(id => laidOut[id].x < root.x)
    const rightChildren = root.children.filter(id => laidOut[id].x > root.x)

    expect(leftChildren.length + rightChildren.length).toBe(root.children.length)
  })

  it('should calculate org-down layout correctly', () => {
    const nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id
    const laidOut = calculateTreeLayout(nodes, rootId, 'org-down')

    const root = laidOut[rootId]
    root.children.forEach(childId => {
      const child = laidOut[childId]
      expect(child.y).toBeGreaterThan(root.y)
    })
  })

  it('should calculate org-up layout correctly', () => {
    const nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id
    const laidOut = calculateTreeLayout(nodes, rootId, 'org-up')

    const root = laidOut[rootId]
    root.children.forEach(childId => {
      const child = laidOut[childId]
      expect(child.y).toBeLessThan(root.y)
    })
  })

  it('should not produce NaN or Infinity coordinates', () => {
    const nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id
    const layouts: LayoutType[] = ['mindmap-right', 'mindmap-left', 'mindmap-both', 'org-down', 'org-up', 'logic-right', 'logic-left']

    for (const layout of layouts) {
      const laidOut = calculateTreeLayout(nodes, rootId, layout)
      Object.values(laidOut).forEach(node => {
        expect(Number.isFinite(node.x)).toBe(true)
        expect(Number.isFinite(node.y)).toBe(true)
        expect(Number.isNaN(node.x)).toBe(false)
        expect(Number.isNaN(node.y)).toBe(false)
      })
    }
  })

  it('should handle deeply nested nodes', () => {
    let nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id

    // 添加多层嵌套
    let parentId = rootId
    for (let i = 0; i < 10; i++) {
      nodes = addChildNode(nodes, parentId)
      const parent = nodes[parentId]
      parentId = parent.children[parent.children.length - 1]
    }

    const laidOut = calculateTreeLayout(nodes, rootId, 'mindmap-right')
    expect(Object.keys(laidOut).length).toBe(Object.keys(nodes).length)
  })

  it('should handle many sibling nodes', () => {
    let nodes = createInitialMindMap()
    const rootId = Object.values(nodes).find(n => n.parentId === null)!.id

    for (let i = 0; i < 50; i++) {
      nodes = addSiblingNode(nodes, rootId)
    }

    const laidOut = calculateTreeLayout(nodes, rootId, 'mindmap-right')
    expect(Object.keys(laidOut).length).toBe(Object.keys(nodes).length)
  })
})
