import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('should render without crashing', () => {
    render(<App />)
    expect(document.body).toBeTruthy()
  })

  it('should render toolbar with MindMap logo', () => {
    render(<App />)
    expect(screen.getByText('MindMap')).toBeInTheDocument()
  })

  it('should render canvas', () => {
    render(<App />)
    const canvas = document.querySelector('[data-canvas="mindmap"]')
    expect(canvas).toBeInTheDocument()
  })
})
