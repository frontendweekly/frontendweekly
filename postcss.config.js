module.exports = (ctx) => ({
  map: ctx.env !== 'production' ? {inline: true} : false,
  plugins: {
    'postcss-import': {},
    cssnano: ctx.env === 'production' ? {} : false,
  },
});
