import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver and dimensions for Recharts in JSDOM
if (typeof window !== 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock;

  Element.prototype.getBoundingClientRect = function () {
    return {
      width: 600,
      height: 240,
      top: 0,
      left: 0,
      bottom: 240,
      right: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    };
  };

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    value: 600,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 240,
  });
}

