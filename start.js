const { execSync } = require('child_process');

console.log('Starting Next.js server...');
execSync('node_modules/.bin/next', ['start'], { stdio: 'inherit' });
