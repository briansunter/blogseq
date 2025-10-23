import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import App from "../App";
import { PageBuilder, BlockBuilder } from "../testing/mock-logseq-sdk";
import type { MockLogseqAPI } from "../testing/mock-logseq-sdk";

/**
 * The main App component integrates all parts of the BlogSeq exporter:
 * header, settings, preview controls, and content preview.
 */
const meta = {
  title: "App/Main",
  component: App,
  parameters: {
    layout: "fullscreen",
    mockLogseq: {
      reset: true,
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state with a simple page loaded
 */
export const Default: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        // Create a simple page with content
        const page = new PageBuilder()
          .withName("My First Blog Post")
          .withProperty("author", "Brian Sunter")
          .withProperty("date", "2024-01-15")
          .withProperty("tags", ["javascript", "react"])
          .build();

        const blocks = [
          new BlockBuilder()
            .withContent("# Introduction")
            .withProperty("logseq.property/heading", 1)
            .build(),
          new BlockBuilder()
            .withContent("This is the introduction to my blog post about React and JavaScript.")
            .build(),
          new BlockBuilder()
            .withContent("## Key Points")
            .withProperty("logseq.property/heading", 2)
            .build(),
          new BlockBuilder()
            .withContent("React is a powerful UI library")
            .build(),
          new BlockBuilder()
            .withContent("JavaScript is the language of the web")
            .build(),
        ];

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);
        blocks.forEach(block => mockAPI.addBlock(block));
      },
    },
  },
};

/**
 * Page with rich formatting including code blocks and lists
 */
export const RichContent: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        const page = new PageBuilder()
          .withName("React Hooks Tutorial")
          .withProperty("author", "Brian Sunter")
          .withProperty("tags", ["react", "hooks", "tutorial"])
          .build();

        const blocks = [
          new BlockBuilder()
            .withContent("# Understanding React Hooks")
            .withProperty("logseq.property/heading", 1)
            .build(),
          new BlockBuilder()
            .withContent("React Hooks changed how we write components.")
            .build(),
          new BlockBuilder()
            .withContent("## Common Hooks")
            .withProperty("logseq.property/heading", 2)
            .build(),
          new BlockBuilder()
            .withContent("**useState** - Manages component state")
            .build(),
          new BlockBuilder()
            .withContent("**useEffect** - Handles side effects")
            .build(),
          new BlockBuilder()
            .withContent("**useCallback** - Memoizes functions")
            .build(),
          new BlockBuilder()
            .withContent("```javascript\nconst [count, setCount] = useState(0);\n```")
            .build(),
        ];

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);
        blocks.forEach(block => mockAPI.addBlock(block));
      },
    },
  },
};

/**
 * Page with nested blocks
 */
export const NestedBlocks: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        const page = new PageBuilder()
          .withName("Project Planning")
          .withProperty("status", "in-progress")
          .build();

        const parentBlock = new BlockBuilder()
          .withContent("Main project tasks")
          .build();

        const childBlocks = [
          new BlockBuilder()
            .withContent("Set up development environment")
            .build(),
          new BlockBuilder()
            .withContent("Implement core features")
            .build(),
          new BlockBuilder()
            .withContent("Write tests")
            .build(),
        ];

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);
        mockAPI.addBlock(parentBlock);
        childBlocks.forEach(block => mockAPI.addBlock(block));
        mockAPI.setPageBlocksTree(page.uuid, [parentBlock, ...childBlocks]);
      },
    },
  },
};

/**
 * Page with block references
 */
export const WithBlockReferences: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        const page = new PageBuilder()
          .withName("Meeting Notes")
          .build();

        const referencedBlock = new BlockBuilder()
          .withUuid("ref-block-123")
          .withContent("Action item: Review the codebase")
          .build();

        const blocks = [
          new BlockBuilder()
            .withContent("# Weekly Meeting")
            .withProperty("logseq.property/heading", 1)
            .build(),
          new BlockBuilder()
            .withContent("Discussed project progress and next steps.")
            .build(),
          referencedBlock,
          new BlockBuilder()
            .withContent("Follow up on ((ref-block-123))")
            .build(),
        ];

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);
        blocks.forEach(block => mockAPI.addBlock(block));
      },
    },
  },
};

/**
 * Page with frontmatter properties
 */
export const WithFrontmatter: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        const page = new PageBuilder()
          .withName("Blog Post Draft")
          .withProperty("title", "The Future of Web Development")
          .withProperty("author", "Brian Sunter")
          .withProperty("date", "2024-01-15")
          .withProperty("tags", ["webdev", "future", "trends"])
          .withProperty("draft", true)
          .withProperty("category", "Technology")
          .build();

        const blocks = [
          new BlockBuilder()
            .withContent("# The Future of Web Development")
            .withProperty("logseq.property/heading", 1)
            .build(),
          new BlockBuilder()
            .withContent("The web development landscape is constantly evolving.")
            .build(),
          new BlockBuilder()
            .withContent("New frameworks and tools emerge every year.")
            .build(),
        ];

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);
        blocks.forEach(block => mockAPI.addBlock(block));
      },
    },
  },
};

/**
 * Empty page - edge case
 */
export const EmptyPage: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        const page = new PageBuilder()
          .withName("Empty Page")
          .build();

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);
      },
    },
  },
};

/**
 * No active page - shows warning state
 */
export const NoActivePage: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        // Don't set any current page
        mockAPI.setCurrentPage(null);
      },
    },
  },
};

/**
 * Long page with lots of content
 */
export const LongPage: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        const page = new PageBuilder()
          .withName("Complete Guide to TypeScript")
          .withProperty("author", "Brian Sunter")
          .withProperty("tags", ["typescript", "guide", "programming"])
          .build();

        const blocks = [
          new BlockBuilder()
            .withContent("# Complete Guide to TypeScript")
            .withProperty("logseq.property/heading", 1)
            .build(),
          new BlockBuilder()
            .withContent("TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.")
            .build(),
          new BlockBuilder()
            .withContent("## Why TypeScript?")
            .withProperty("logseq.property/heading", 2)
            .build(),
          new BlockBuilder()
            .withContent("TypeScript adds optional static typing to JavaScript.")
            .build(),
          new BlockBuilder()
            .withContent("This helps catch errors early and improves code maintainability.")
            .build(),
          new BlockBuilder()
            .withContent("## Basic Types")
            .withProperty("logseq.property/heading", 2)
            .build(),
          new BlockBuilder()
            .withContent("TypeScript includes all JavaScript types plus additional ones.")
            .build(),
          new BlockBuilder()
            .withContent("**number** - Numeric values")
            .build(),
          new BlockBuilder()
            .withContent("**string** - Text values")
            .build(),
          new BlockBuilder()
            .withContent("**boolean** - True/false values")
            .build(),
          new BlockBuilder()
            .withContent("**array** - Collections of values")
            .build(),
          new BlockBuilder()
            .withContent("**tuple** - Fixed-length arrays")
            .build(),
          new BlockBuilder()
            .withContent("**enum** - Named constants")
            .build(),
          new BlockBuilder()
            .withContent("**any** - Opt-out of type checking")
            .build(),
          new BlockBuilder()
            .withContent("**void** - No value")
            .build(),
          new BlockBuilder()
            .withContent("## Interfaces")
            .withProperty("logseq.property/heading", 2)
            .build(),
          new BlockBuilder()
            .withContent("Interfaces define the structure of objects.")
            .build(),
          new BlockBuilder()
            .withContent("```typescript\ninterface User {\n  name: string;\n  age: number;\n}\n```")
            .build(),
        ];

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);
        blocks.forEach(block => mockAPI.addBlock(block));
      },
    },
  },
};

/**
 * Page with special characters and emojis
 */
export const SpecialCharacters: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        const page = new PageBuilder()
          .withName("🚀 Project Launch 2024/01/15")
          .withProperty("status", "🟢 Active")
          .build();

        const blocks = [
          new BlockBuilder()
            .withContent("# 🎉 Project Launch")
            .withProperty("logseq.property/heading", 1)
            .build(),
          new BlockBuilder()
            .withContent("Welcome to the launch! Here are some special chars: & < > \" '")
            .build(),
          new BlockBuilder()
            .withContent("Emojis work too: 💡 🔥 ⚡ 🎯")
            .build(),
        ];

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);
        blocks.forEach(block => mockAPI.addBlock(block));
      },
    },
  },
};
