const { fixupPluginRules } = require('@eslint/compat')
const pluginNext = require('@next/eslint-plugin-next')
const pluginReact = require('eslint-plugin-react')
const pluginReactHooks = require('eslint-plugin-react-hooks')
const pluginTypeScript = require('@typescript-eslint/eslint-plugin')
const parserTypeScript = require('@typescript-eslint/parser')

const nextPlugin = {
  name: '@next/next',
  rules: pluginNext.rules,
}

module.exports = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'dist/**',
      '*.config.js',
      '*.config.ts',
      '__tests__/**',
      'k6/**',
      'scripts/**',
      'start.js',
      'src/worker/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: parserTypeScript,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      react: fixupPluginRules(pluginReact),
      'react-hooks': fixupPluginRules(pluginReactHooks),
      '@typescript-eslint': fixupPluginRules(pluginTypeScript),
    },
    rules: {
      // Next.js recommended rules
      '@next/next/google-font-display': 'error',
      '@next/next/google-font-preconnect': 'error',
      '@next/next/next-script-for-ga': 'error',
      '@next/next/no-async-client-component': 'error',
      '@next/next/no-before-interactive-script-outside-document': 'error',
      '@next/next/no-css-tags': 'error',
      '@next/next/no-head-element': 'error',
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'warn',
      '@next/next/no-page-custom-font': 'error',
      '@next/next/no-styled-jsx-in-document': 'error',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-title-in-document-head': 'error',
      '@next/next/no-typos': 'error',
      '@next/next/no-unwanted-polyfillio': 'error',
      '@next/next/inline-script-id': 'error',
      '@next/next/no-assign-module-variable': 'error',
      '@next/next/no-document-import-in-page': 'error',
      '@next/next/no-duplicate-head': 'error',
      '@next/next/no-head-import-in-document': 'error',
      '@next/next/no-script-component-in-head': 'error',
      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    settings: {
      next: { rootDir: __dirname },
      react: { version: '18' },
    },
  },
]