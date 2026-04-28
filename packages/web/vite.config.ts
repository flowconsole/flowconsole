import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    dts({ tsconfigPath: './tsconfig.json' }),
  ],
  build: {
    lib: {
      entry: {
        'flowconsole-web': resolve(__dirname, 'index.ts'),
        'architecture/index': resolve(__dirname, 'architecture/index.ts'),
      },
      name: 'FlowConsoleWeb',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@monaco-editor/react',
        '@xyflow/react',
        '@xyflow/system',
        'react-router-dom',
      ],
    },
  },
});
