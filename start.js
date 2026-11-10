const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(standalonePath)) {
  console.log('Starting Next.js standalone server...');
  execSync('node server.js', { stdio: 'inherit' });
} else {
  console.log('Standalone server not found. Falling back to next start...');
  try {
    execSync('node_modules/.bin/next', ['start'], { stdio: 'inherit' });
  } catch (err) {
    console.error('next start failed:', err.message);
    process.exit(1);
  }
}
