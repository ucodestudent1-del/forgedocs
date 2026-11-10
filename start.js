const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');

if (!fs.existsSync(standalonePath)) {
  console.log('Standalone server not found. Building Next.js app...');
  try {
    execSync('next build', { stdio: 'inherit' });
  } catch (err) {
    console.error('Build failed:', err.message);
    process.exit(1);
  }
}

if (!fs.existsSync(standalonePath)) {
  console.error('Standalone server still missing after build. Check next.config.js has output: "standalone".');
  process.exit(1);
}

console.log('Starting Next.js standalone server...');
execSync('node server.js', { stdio: 'inherit' });
