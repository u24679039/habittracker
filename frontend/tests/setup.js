import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver, which recharts' <ResponsiveContainer>
// needs to measure its parent. A minimal no-op stub is enough for tests,
// which only assert on rendered text/attributes, not real layout.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

