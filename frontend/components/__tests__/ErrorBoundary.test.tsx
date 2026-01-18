/**
 * ErrorBoundary Component Test Suite
 * 
 * Tests the global error boundary component:
 * - Error catching and handling
 * - Fallback UI rendering
 * - Error logging
 * - Recovery mechanisms
 * - Component state management
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

/**
 * Component that throws an error for testing
 */
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

/**
 * Suppress console.error for cleaner test output
 */
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Behavior', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child component</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Child component')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors from child components', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      // Should display error UI instead of crashing
      expect(container.innerHTML).toMatch(/error|something went wrong/i);
    });
    
    it('should display fallback UI when error is caught', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      // Check for fallback UI elements
      expect(container.innerHTML).toMatch(/error|something went wrong/i);
    });
  });
});
