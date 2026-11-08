const { execSync } = require('child_process');

console.log('Building Next.js app...');
execSync('next build', { stdio: 'inherit' });

console.log('Starting Next.js server...');
execSync('next start', { stdio: 'inherit' });