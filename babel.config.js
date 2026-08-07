// Babel is used ONLY by Jest (via babel-jest) to transform the ESM syntax in
// shared/*.js into CommonJS so tests can require() them.
// Netlify Functions use esbuild and browsers load files directly; neither
// reads this config.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
