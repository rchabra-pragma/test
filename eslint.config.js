// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // build output and generated native projects are not ours to lint
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'scripts/*'],
  },
]);
