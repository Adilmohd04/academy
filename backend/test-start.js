// Simple test to check if backend can start
console.log('Testing backend startup...');

const { spawn } = require('child_process');

const backend = spawn('npx', ['ts-node', 'src/server.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

backend.on('error', (error) => {
  console.error('Failed to start backend:', error);
});

backend.on('exit', (code) => {
  console.log(`Backend exited with code ${code}`);
});

// Kill after 10 seconds
setTimeout(() => {
  backend.kill();
  process.exit(0);
}, 10000);
