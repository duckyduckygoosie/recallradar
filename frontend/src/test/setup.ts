import '@testing-library/jest-dom/vitest';

class TestResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const entry: ResizeObserverEntry = {
      target,
      contentRect: new DOMRect(0, 0, 640, 256),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    };
    this.callback([entry], this);
  }
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: TestResizeObserver });
