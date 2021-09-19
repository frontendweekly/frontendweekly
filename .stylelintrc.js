module.exports = {
  extends: '@frontendweekly/stylelint-config',
  rules: {
    'csstools/value-no-unknown-custom-properties': [
      true,
      {
        severity: 'warning',
      },
    ],
  },
};
