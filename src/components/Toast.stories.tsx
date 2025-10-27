import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { ToastProvider, useToast } from './Toast';

/**
 * Toast notifications provide feedback to users about actions and events.
 * They appear at the bottom-right of the screen and auto-dismiss after a few seconds.
 */
const meta = {
  title: 'Components/Toast',
  component: ToastProvider,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Helper component to trigger toasts from stories
 */
const ToastDemo: React.FC<{
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  autoShow?: boolean;
}> = ({ type, message, autoShow = true }) => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  useEffect(() => {
    if (autoShow) {
      const timer = setTimeout(() => {
        switch (type) {
          case 'success':
            showSuccess(message);
            break;
          case 'error':
            showError(message);
            break;
          case 'warning':
            showWarning(message);
            break;
          case 'info':
            showInfo(message);
            break;
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [type, message, autoShow, showSuccess, showError, showWarning, showInfo]);

  return (
    <div className="p-8 bg-gray-900 min-h-screen flex flex-col gap-4">
      <h2 className="text-xl text-gray-100 mb-4">Toast Notification Demo</h2>
      <p className="text-gray-400 mb-4">Click buttons to show different toast types:</p>
      <div className="flex gap-3">
        <button
          onClick={() => showSuccess(message)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        >
          Success Toast
        </button>
        <button
          onClick={() => showError(message)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          Error Toast
        </button>
        <button
          onClick={() => showWarning(message)}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded"
        >
          Warning Toast
        </button>
        <button
          onClick={() => showInfo(message)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Info Toast
        </button>
      </div>
    </div>
  );
};

/**
 * Success toast - confirms successful operations
 */
export const Success: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastDemo type="success" message="Export completed successfully!" />
    </ToastProvider>
  ),
};

/**
 * Error toast - alerts user to failures
 */
export const Error: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastDemo type="error" message="Failed to export page. Please try again." />
    </ToastProvider>
  ),
};

/**
 * Warning toast - shows important information
 */
export const Warning: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastDemo type="warning" message="Please open a page first before exporting" />
    </ToastProvider>
  ),
};

/**
 * Info toast - provides general information
 */
export const Info: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastDemo type="info" message="Copied to clipboard!" />
    </ToastProvider>
  ),
};

/**
 * Long message toast - tests text wrapping
 */
export const LongMessage: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastDemo
        type="info"
        message="This is a very long toast message that should wrap properly and remain readable even with a lot of text content inside it."
      />
    </ToastProvider>
  ),
};

/**
 * Multiple toasts at once
 */
export const MultipleToasts: Story = {
  args: { children: null },
  render: () => {
    const MultiToastDemo = () => {
      const { showSuccess, showError, showWarning, showInfo } = useToast();

      useEffect(() => {
        const timers = [
          setTimeout(() => showInfo('Starting export process...'), 500),
          setTimeout(() => showSuccess('Page content processed'), 1500),
          setTimeout(() => showWarning('Some assets not found'), 2500),
          setTimeout(() => showError('Export failed due to network error'), 3500),
        ];
        return () => timers.forEach(clearTimeout);
      }, [showSuccess, showError, showWarning, showInfo]);

      return (
        <div className="p-8 bg-gray-900 min-h-screen">
          <h2 className="text-xl text-gray-100 mb-4">Multiple Toasts Demo</h2>
          <p className="text-gray-400">Watch as multiple toasts appear sequentially</p>
        </div>
      );
    };

    return (
      <ToastProvider>
        <MultiToastDemo />
      </ToastProvider>
    );
  },
};

/**
 * Interactive playground - no auto-show
 */
export const Interactive: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastDemo type="success" message="Click any button to test!" autoShow={false} />
    </ToastProvider>
  ),
};
