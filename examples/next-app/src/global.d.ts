export {};

declare global {
  interface Window {
    varify?: { serverSideQueue?: unknown[] };
  }
}
