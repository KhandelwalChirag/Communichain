import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Start Vite dev server
const vite = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir
});

// Start Express server
const server = spawn('npm', ['run', 'dev:server'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir
});

// Handle process termination
const cleanup = () => {
  vite.kill();
  server.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);