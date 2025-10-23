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

// Install globally before stories load
(global as any).logseq = globalMockLogseq;
(window as any).logseq = globalMockLogseq;

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

      // Apply ToastProvider wrapper if not disabled
      const withToast = context.parameters.withToastProvider !== false;

      return (
        <div className="storybook-container" style={{ minHeight: "100vh" }}>
          {withToast ? (
            <ToastProvider>
              <Story />
            </ToastProvider>
          ) : (
            <Story />
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
