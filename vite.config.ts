import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/cli.ts'),
      name: 'initbox',
      formats: ['es'],
      fileName: () => 'cli.js',
    },
    rollupOptions: {
      external: [
        // Node.js built-ins
        /^node:.*/,
        'fs',
        'path',
        'os',
        'child_process',
        'readline',
        'stream',
        'util',
        'events',
        'tty',
        'assert',
        'crypto',
        'buffer',
        'process',
        'url',
        // All npm dependencies should be external for CLI
        'chalk',
        'commander',
        'inquirer',
        'js-yaml',
        'ora',
        /^@inquirer\/.*/,
      ],
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
    target: 'node18',
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    ssr: true,
  },
  ssr: {
    // This ensures all node modules are externalized
    noExternal: false,
  },
});
