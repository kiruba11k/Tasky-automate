module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: '18.3' } },
  plugins: ['react-hooks'],
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react/jsx-runtime', ],
  rules: { 'react-hooks/rules-of-hooks': 'error', 'react/prop-types': 'off', 'react/no-unescaped-entities': 'off', 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^React$' }], 'react-hooks/exhaustive-deps': 'off' },
  overrides: [{ files: ['src/fun/three/**/*.jsx'], rules: { 'react/no-unknown-property': 'off' } }],
};
