/**
 * Jest Setup File
 * 
 * Global configuration and mocks for all Jest tests.
 * Runs once before all test suites.
 */

import '@testing-library/jest-dom';

/**
 * Mock window.matchMedia for component tests
 * Required for components that use media queries or prefers-reduced-motion
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

/**
 * Mock window.open for external link tests
 */
global.open = jest.fn();

/**
 * Suppress console errors and warnings in tests
 * Uncomment to reduce test output noise
 */
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };
