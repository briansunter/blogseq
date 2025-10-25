import type { Preview } from "@storybook/react";
import React from "react";
import { MockLogseqAPI } from "../src/testing/mock-logseq-sdk";
import { ToastProvider } from "../src/components/Toast";
import "../src/index.css";

// Create a global mock Logseq API instance
const globalMockLogseq = new MockLogseqAPI();

// Configure the mock with common defaults
globalMockLogseq.setCurrentGraph({
  path: "/Users/test/logseq-graph",
  name: "Test Graph",
});

// Add common property definitions
globalMockLogseq.addPropertyDefinition(":user.property/author", "author");
globalMockLogseq.addPropertyDefinition(":user.property/tags", "tags");
globalMockLogseq.addPropertyDefinition(":user.property/date", "date");
globalMockLogseq.addPropertyDefinition(":user.property/blogTags", "blogTags");

// Create a proxy that exposes MockLogseqAPI methods at the top level
// while maintaining namespace methods for compatibility
const logseqProxy = new Proxy(globalMockLogseq, {
  get(target, prop) {
    // Create namespace proxies for compatibility with real Logseq API
    if (prop === 'Editor') {
      return {
        getCurrentPage: () => globalMockLogseq.getCurrentPage(),
        getPage: (uuid: string) => globalMockLogseq.getPage(uuid),
        getBlock: (uuid: string, opts?: any) => globalMockLogseq.getBlock(uuid, opts),
        getPageBlocksTree: (uuid: string) => globalMockLogseq.getPageBlocksTree(uuid),
      };
    }
    if (prop === 'App') {
      return {
        getCurrentGraph: () => globalMockLogseq.getCurrentGraph(),
      };
    }
    if (prop === 'DB') {
      return {
        datascriptQuery: (query: string) => globalMockLogseq.datascriptQuery(query),
      };
    }
    if (prop === 'UI') {
      return {
        showMsg: (message: string, type: 'success' | 'error' | 'warning') =>
          globalMockLogseq.showMsg(message, type),
      };
    }

    // Check if it's a direct method on the mock
    if (prop in target) {
      const value = (target as any)[prop];
      // Bind methods to maintain 'this' context
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
    // Return undefined for missing properties
    return undefined;
  },
});

// Set Storybook mode flag globally so App component detects it
(window as any).__STORYBOOK_MODE__ = true;

// Install globally before stories load
(global as any).logseq = logseqProxy;
(window as any).logseq = logseqProxy;

// Export for use in story setup functions
export { globalMockLogseq };

/**
 * Wrapper component that initializes visibility for Storybook
 * Emits the ui:visible:changed event so the hook can update
 * The App component detects Storybook mode and skips auto-export
 */
function StoryWithVisibility({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Set the property
    (globalMockLogseq as any).isMainUIVisible = true;
    // Emit event to trigger hook updates
    // Auto-export is skipped in Storybook, so no toast loop
    globalMockLogseq.emit('ui:visible:changed', { visible: true }).catch(err => {
      console.error('Failed to emit visibility event:', err);
    });
  }, []);

  return <>{children}</>;
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        {
          name: "dark",
          value: "#0a0a0a",
        },
        {
          name: "logseq-dark",
          value: "#1a1a1a",
        },
        {
          name: "light",
          value: "#ffffff",
        },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      // Reset mock state between stories
      if (context.parameters.mockLogseq?.reset !== false) {
        globalMockLogseq.reset();
        // Re-apply default configuration
        globalMockLogseq.setCurrentGraph({
          path: "/Users/test/logseq-graph",
          name: "Test Graph",
        });
        globalMockLogseq.addPropertyDefinition(":user.property/author", "author");
        globalMockLogseq.addPropertyDefinition(":user.property/tags", "tags");
        globalMockLogseq.addPropertyDefinition(":user.property/date", "date");
        globalMockLogseq.addPropertyDefinition(":user.property/blogTags", "blogTags");
      }

      // Apply story-specific mock configuration
      if (context.parameters.mockLogseq?.setup) {
        context.parameters.mockLogseq.setup(globalMockLogseq);
      }

      // Ensure current page is set if data was added
      if (globalMockLogseq.getPageCount() > 0 && !globalMockLogseq.getState().currentPage) {
        const firstPage = globalMockLogseq.getPages()[0];
        if (firstPage) {
          globalMockLogseq.setCurrentPage(firstPage);
        }
      }

      // Apply ToastProvider wrapper if not disabled
      const withToast = context.parameters.withToastProvider !== false;

      // Show UI by default unless explicitly disabled
      const showUI = context.parameters.mockLogseq?.showUI !== false;

      return (
        <div className="storybook-container" style={{ minHeight: "100vh" }}>
          {showUI ? (
            <StoryWithVisibility>
              {withToast ? (
                <ToastProvider>
                  <Story />
                </ToastProvider>
              ) : (
                <Story />
              )}
            </StoryWithVisibility>
          ) : (
            withToast ? (
              <ToastProvider>
                <Story />
              </ToastProvider>
            ) : (
              <Story />
            )
          )}
        </div>
      );
    },
  ],
  globalTypes: {
    mockReset: {
      description: "Reset mock Logseq API between stories",
      defaultValue: true,
      toolbar: {
        title: "Mock Reset",
        items: [
          { value: true, title: "Reset Mock", icon: "circlehollow" },
          { value: false, title: "Preserve Mock", icon: "circle" },
        ],
      },
    },
  },
};

export default preview;
