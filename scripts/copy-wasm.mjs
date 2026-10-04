// Copies the sql.js WebAssembly binary used by jeep-sqlite (web storage) into public/assets.
// jeep-sqlite 2.8 bundles the sql.js 1.11 JS glue, so the wasm must come from that exact
// version (installed as the `sql.js-jeep` alias); a newer wasm fails with a LinkError.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
mkdirSync('public/assets', { recursive: true });
copyFileSync(require.resolve('sql.js-jeep/dist/sql-wasm.wasm'), 'public/assets/sql-wasm.wasm');
