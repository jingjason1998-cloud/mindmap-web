import { describe, it, expect, beforeEach } from 'vitest'
import { useMindMapStore } from '../stores/mindMapStore'

describe('MindMapStore', () => {
  beforeEach(() => {
    useMindMapStore.getState().initialize()
  })

  it('should initialize with correct default state', () => {
    const state = useMindMapStore.getState()
    expect(state.name).toBe('未命名思维导图')
    expect(state.layout).toBe('mindmap-right')
    expect(state.scale).toBe(1)
    expect(Object.keys(state.nodes).length).toBeGreaterThan(0)
    expect(state.rootNodeId).toBeTruthy()
  })

  it('should have root node with null parentId', () => {
    const state = useMindMapStore.getState()
    const root = state.nodes[state.rootNodeId]
    expect(root.parentId).toBeNull()
    expect(root.text).toBe('中心主题')
  })

  it('should add child node', () => {
    const state = useMindMapStore.getState()
    const root = state.nodes[state.rootNodeId]
    const initialChildCount = root.children.length

    state.addChild(root.id)
    const newState = useMindMapStore.getState()
    const newRoot = newState.nodes[newState.rootNodeId]

    expect(newRoot.children.length).toBe(initialChildCount + 1)
  })

  it('should add sibling node', () => {
    const state = useMindMapStore.getState()
    const root = state.nodes[state.rootNodeId]
    const firstChildId = root.children[0]
    const initialChildCount = root.children.length

    state.addSibling(firstChildId)
    const newState = useMindMapStore.getState()
    const newRoot = newState.nodes[newState.rootNodeId]

    expect(newRoot.children.length).toBe(initialChildCount + 1)
  })

  it('should delete node', () => {
    const state = useMindMapStore.getState()
    const root = state.nodes[state.rootNodeId]
    const firstChildId = root.children[0]
    const initialNodeCount = Object.keys(state.nodes).length

    state.deleteNode(firstChildId)
    const newState = useMindMapStore.getState()

    expect(Object.keys(newState.nodes).length).toBeLessThan(initialNodeCount)
    expect(newState.nodes[firstChildId]).toBeUndefined()
  })

  it('should not delete root node', () => {
    const state = useMindMapStore.getState()
    const initialNodeCount = Object.keys(state.nodes).length

    state.deleteNode(state.rootNodeId)
    const newState = useMindMapStore.getState()

    expect(Object.keys(newState.nodes).length).toBe(initialNodeCount)
  })

  it('should toggle collapse', () => {
    const state = useMindMapStore.getState()
    const root = state.nodes[state.rootNodeId]
    if (root.children.length === 0) return

    const firstChildId = root.children[0]
    const firstChild = state.nodes[firstChildId]
    if (firstChild.children.length === 0) return

    expect(firstChild.collapsed).toBeFalsy()
    state.toggleCollapse(firstChildId)

    const newState = useMindMapStore.getState()
    expect(newState.nodes[firstChildId].collapsed).toBe(true)
  })

  it('should update node text', () => {
    const state = useMindMapStore.getState()
    const root = state.nodes[state.rootNodeId]

    state.updateNodeText(root.id, '新标题')
    const newState = useMindMapStore.getState()

    expect(newState.nodes[root.id].text).toBe('新标题')
  })

  it('should switch layouts', () => {
    const state = useMindMapStore.getState()
    const layouts = ['mindmap-right', 'mindmap-left', 'mindmap-both', 'org-down', 'org-up', 'logic-right', 'logic-left'] as const

    for (const layout of layouts) {
      state.setLayout(layout)
      const newState = useMindMapStore.getState()
      expect(newState.layout).toBe(layout)
      expect(Object.keys(newState.nodes).length).toBeGreaterThan(0)

      // 所有节点应该有有效的坐标
      Object.values(newState.nodes).forEach(node => {
        expect(typeof node.x).toBe('number')
        expect(typeof node.y).toBe('number')
        expect(Number.isFinite(node.x)).toBe(true)
        expect(Number.isFinite(node.y)).toBe(true)
      })
    }
  })
})
