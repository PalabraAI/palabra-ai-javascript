import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  optimizeDeps: {
    include: ['events'],
  },
  define: {
    global: 'window',
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/lib.ts',
      name: 'Palabra',
      fileName: 'lib',
      formats: ['es'],
    },
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'lib.js',
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
    }),
  ],
});
