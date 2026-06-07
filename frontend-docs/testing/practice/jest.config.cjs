module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.js', '**/*.test.jsx'],
  setupFilesAfterEach: ['@testing-library/jest-dom'],
}
