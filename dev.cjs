const { fork } = require('child_process');
const path = require('path');

console.log('🚀 Menjalankan Server API MySQL & Vite Frontend...');

const apiProcess = fork(path.resolve(__dirname, 'server/index.cjs'), [], {
  stdio: 'inherit',
  env: process.env
});

const viteProcess = fork(path.resolve(__dirname, 'node_modules/vite/bin/vite.js'), [], {
  stdio: 'inherit',
  env: process.env
});

function cleanup() {
  apiProcess.kill();
  viteProcess.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

