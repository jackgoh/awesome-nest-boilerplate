import 'node:crypto';

declare module 'node:crypto' {
  /** Added to the Node.js 24 LTS line in 24.16.0. */
  function randomUUIDv7(options?: RandomUUIDOptions): UUID;
}
