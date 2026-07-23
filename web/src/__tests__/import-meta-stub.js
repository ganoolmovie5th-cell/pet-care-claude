// ponytail: shim import.meta.env for ts-jest (Vite-only feature)
Object.defineProperty(globalThis, 'import', {
  value: { meta: { env: {} } },
  writable: true,
  configurable: true,
});
