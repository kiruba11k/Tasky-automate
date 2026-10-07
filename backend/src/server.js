import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { app } = createApp({
  dataDir: process.env.DATA_DIR || path.join(root, 'data'),
  staticDir: path.join(root, '..', 'frontend', 'dist'),
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`Tasky backend listening on http://localhost:${port}`));
