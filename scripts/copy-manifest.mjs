import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('extension/manifest.json', 'dist/manifest.json');
