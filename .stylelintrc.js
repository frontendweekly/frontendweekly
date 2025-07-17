module.exports = {
  extends: './stylelint-config-molle.js',
  rules: {
    'csstools/value-no-unknown-custom-properties': [
      true,
      {
        severity: 'warning',
      },
    ],
  },
};
