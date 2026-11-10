const { execSync } = require('child_process');

console.log('Starting Next.js standalone server...');
execSync('node server.js', { stdio: 'inherit' });
