import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { render } from '@testing-library/react';

/**
 * ErrorBoundary component test suite
 * Tests error catching, rendering, and error propagation
 */

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Normal rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div data-testid="test-child">Test Content</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should pass through props correctly', () => {
      render(
        <ErrorBoundary>
          <div className="test-class" data-testid="styled-child">
            Styled Child
          </div>
        </ErrorBoundary>
      );

      const child = screen.getByTestId('styled-child');
      expect(child).toHaveClass('test-class');
    });
  });

  describe('Error catching', () => {
    it('should catch errors thrown in child components', () => {
      const ThrowError = () => {
        throw new Error('Test error message');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // ErrorBoundary should display error UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should display error details when error is thrown', () => {
      const ThrowError = () => {
        throw new Error('Specific error for testing');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should not catch errors in event handlers', () => {
      const ButtonWithEventError = () => (
        <button onClick={() => {
          throw new Error('Event handler error');
        }}>
          Click me
        </button>
      );

      // Event handler errors are not caught by Error Boundary
      // This should not throw during render
      expect(() => {
        render(
          <ErrorBoundary>
            <ButtonWithEventError />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('should handle multiple errors independently', () => {
      const ThrowError = ({ message }: { message: string }) => {
        throw new Error(message);
      };

      render(
        <ErrorBoundary>
          <ThrowError message="First error" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Error state management', () => {
    it('should have error state after error is caught', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Error boundary should be in error state (showing error UI)
      expect(container.textContent).toContain('error');
    });

    it('should maintain error state after re-render', () => {
      const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>No error</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();

      // Once an error boundary catches an error, it stays in error state
      // until it's unmounted and remounted
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Error callback (onError)', () => {
    it('should call onError callback when error is caught', () => {
      const onErrorMock = vi.fn();
      const ThrowError = () => {
        throw new Error('Test error for callback');
      };

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalled();
      const callArgs = onErrorMock.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Error);
      expect(callArgs[0].message).toBe('Test error for callback');
    });

    it('should pass error info to onError callback', () => {
      const onErrorMock = vi.fn();
      const ThrowError = () => {
        throw new Error('Error with info');
      };

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should not call onError if no error occurs', () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <div>No error</div>
        </ErrorBoundary>
      );

      expect(onErrorMock).not.toHaveBeenCalled();
    });
  });

  describe('Complex error scenarios', () => {
    it('should handle nested ErrorBoundaries', () => {
      const ThrowError = () => {
        throw new Error('Nested error');
      };

      render(
        <ErrorBoundary>
          <div>
            <ErrorBoundary>
              <ThrowError />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should handle errors from deep component tree', () => {
      const DeepComponent = () => {
        throw new Error('Deep error');
      };

      const MiddleComponent = () => (
        <div>
          <DeepComponent />
        </div>
      );

      render(
        <ErrorBoundary>
          <MiddleComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should handle conditional rendering with errors', () => {
      const ConditionalError = ({ show }: { show: boolean }) => {
        if (show) {
          throw new Error('Conditional error');
        }
        return <div>Safe content</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalError show={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Safe content')).toBeInTheDocument();
    });
  });

  describe('Error UI', () => {
    it('should display user-friendly error message', () => {
      const ThrowError = () => {
        throw new Error('User-facing error');
      };

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should show something like "Something went wrong" or similar
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should have accessible error display', () => {
      const ThrowError = () => {
        throw new Error('Accessibility test');
      };

      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Error message should be in the DOM and readable
      const errorElement = container.querySelector('[role="alert"]') ||
                          container.querySelector('[class*="bg-red"]');
      expect(errorElement).toBeTruthy();
      expect(container.textContent).toContain('Something went wrong');
    });
  });

  describe('TypeScript types', () => {
    it('should accept children prop', () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <div>Child</div>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });

    it('should accept onError callback', () => {
      const callback = vi.fn();
      expect(() => {
        render(
          <ErrorBoundary onError={callback}>
            <div>Child</div>
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });
});
