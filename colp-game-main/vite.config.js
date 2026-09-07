import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    port: 3000,
    host: true
  },
  resolve: {
    alias: {
      'playcanvas': path.resolve(__dirname, 'src/playcanvas.mjs')
    }
  }
});
