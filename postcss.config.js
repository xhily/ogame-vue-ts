export default {
  plugins: {
    'postcss-preset-env': {
      stage: 2,
      features: {
        'oklab-function': { preserve: true },
        'color-mix': true,
        'custom-selectors': true,
        'nesting-rules': true,
        'is-pseudo-class': false
      },
      browsers: ['Chrome >= 80', 'Firefox >= 80', 'Safari >= 14', 'Edge >= 80']
    }
  }
}
