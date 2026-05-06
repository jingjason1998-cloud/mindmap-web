import '@testing-library/jest-dom'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock URL.createObjectURL
global.URL.createObjectURL = () => 'blob:test'
global.URL.revokeObjectURL = () => {}

// Mock login state for tests
const LOGIN_KEY = 'mindmap-login-phone';
localStorage.setItem(LOGIN_KEY, '13800138000');
