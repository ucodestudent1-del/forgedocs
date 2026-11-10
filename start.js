const { execSync } = require('child_process');

try {
  console.log('Building Next.js app...');
  execSync('next build', { stdio: 'inherit' });
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}

try {
  console.log('Starting Next.js server...');
  execSync('next start', { stdio: 'inherit' });
} catch (err) {
  console.error('Server failed to start:', err.message);
  process.exit(1);
}