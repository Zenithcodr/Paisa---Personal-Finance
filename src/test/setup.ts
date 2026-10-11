import "@testing-library/jest-dom/vitest";

// jsdom has no canvas 2d context. Provide a no-op stub so chart components
// (which draw in a useEffect) can render in component tests without crashing.
const noop = (): void => {};
const ctxStub: unknown = new Proxy(
  {},
  {
    get: (_t, prop) => {
      if (prop === "createLinearGradient") return () => ({ addColorStop: noop });
      if (prop === "measureText") return () => ({ width: 0 });
      return noop;
    },
    set: () => true
  }
);

HTMLCanvasElement.prototype.getContext =
  (() => ctxStub) as unknown as typeof HTMLCanvasElement.prototype.getContext;
