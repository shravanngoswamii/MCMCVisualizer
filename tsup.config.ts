import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library (ESM + CJS, browser + Node)
  {
    entry:      { index: 'src/index.ts' },
    format:     ['esm', 'cjs'],
    dts:        true,
    sourcemap:  true,
    clean:      true,
    minify:     false,
    splitting:  false,
    platform:   'neutral',
    target:     'es2020',
    external:   ['plotly.js-dist-min'],
  },
  // CLI binary (CJS only, Node.js)
  {
    entry:      { 'cli/index': 'src/cli/index.ts' },
    format:     ['cjs'],
    dts:        false,
    sourcemap:  true,
    minify:     false,
    splitting:  false,
    platform:   'node',
    target:     'node18',
    banner:     { js: '#!/usr/bin/env node' },
    noExternal: [],   // bundle everything into the CLI
  },
]);
