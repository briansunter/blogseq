import type { Meta, StoryObj } from "@storybook/react";
import { PreviewContent } from "./PreviewContent";

/**
 * The PreviewContent component renders markdown content in either raw or rendered mode.
 * It handles frontmatter, images, code blocks, and all standard markdown elements.
 */
const meta = {
	title: "Components/PreviewContent",
	component: PreviewContent,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	argTypes: {
		previewMode: {
			control: "radio",
			options: ["raw", "rendered"],
			description: "Display mode for the markdown content",
		},
	},
} satisfies Meta<typeof PreviewContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMarkdownWithFrontmatter = `---
title: My First Blog Post
author: Brian Sunter
date: 2024-01-15
tags: [javascript, react, logseq]
---

# Introduction to Logseq

Logseq is a powerful knowledge management tool that helps you organize your thoughts and ideas.

## Key Features

- **Bi-directional links**: Connect related notes seamlessly
- **Block references**: Reuse content across multiple pages
- **Graph visualization**: See connections between your notes

### Code Examples

Here's a simple JavaScript function:

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

### Lists

Unordered list:
- First item
- Second item
- Third item

Ordered list:
1. Step one
2. Step two
3. Step three

### Quotes

> "The best way to predict the future is to invent it."
> — Alan Kay

### Inline Code

You can use \`inline code\` with backticks.

### Links

Visit [Logseq](https://logseq.com) for more information.
`;

const simpleMarkdown = `# Simple Page

This is a simple markdown document with basic formatting.

Just some text and a few paragraphs.

**Bold text** and *italic text* are supported.
`;

const codeHeavyMarkdown = `# Code Examples

## Python

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
\`\`\`

## TypeScript

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}
\`\`\`

## Inline code

Use \`console.log()\` for debugging and \`npm install\` to add packages.
`;

const longArticle = `---
title: Understanding React Hooks
author: Brian Sunter
date: 2024-01-15
tags: [react, javascript, hooks]
---

# Understanding React Hooks

React Hooks revolutionized how we write React components by allowing us to use state and other React features without writing classes.

## What are Hooks?

Hooks are functions that let you "hook into" React state and lifecycle features from function components. They were introduced in React 16.8 and have become the standard way to write React components.

### The Rules of Hooks

1. Only call hooks at the top level
2. Only call hooks from React functions
3. Use the ESLint plugin to enforce these rules

## Common Hooks

### useState

The \`useState\` hook lets you add state to function components:

\`\`\`javascript
const [count, setCount] = useState(0);
\`\`\`

### useEffect

The \`useEffect\` hook lets you perform side effects in function components:

\`\`\`javascript
useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);
\`\`\`

### useCallback

Memoizes callback functions:

\`\`\`javascript
const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b],
);
\`\`\`

## Custom Hooks

You can create your own hooks to extract component logic:

\`\`\`javascript
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
\`\`\`

## Best Practices

> "With great power comes great responsibility."

1. **Keep hooks simple**: Each hook should do one thing well
2. **Name custom hooks properly**: Always start with "use"
3. **Document dependencies**: Be explicit about useEffect dependencies
4. **Avoid unnecessary re-renders**: Use useMemo and useCallback wisely

## Conclusion

React Hooks have made functional components more powerful and easier to understand. They encourage better code reuse and composition.

For more information, visit the [React documentation](https://react.dev/reference/react).
`;

const markdownWithImages = `# Image Gallery

Here's an image from our assets:

![Sample Image](assets/sample-image.png)

## Multiple Images

![First Image](assets/image1.jpg)

![Second Image](assets/image2.png)
`;

const complexFormatting = `# Advanced Markdown Features

## Tables (if supported)

| Feature | Status | Priority |
|---------|--------|----------|
| Export | Done | High |
| Preview | Done | High |
| Batch | Planned | Medium |

## Nested Lists

- Level 1
  - Level 2
    - Level 3
      - Level 4

## Mixed Lists

1. First ordered item
   - Nested unordered
   - Another nested item
2. Second ordered item
   - More nesting
     1. Nested ordered
     2. Another ordered

## Horizontal Rules

Content above

---

Content below

## Blockquotes

> Simple blockquote

> Multi-line
> blockquote
> with several lines

> Nested quote
>> Even more nested

## Special Characters

Testing special chars: & < > " ' \` @ # $ % ^ * ( ) [ ] { }
`;

/**
 * Default rendered view with frontmatter and rich content
 */
export const Default: Story = {
	args: {
		preview: sampleMarkdownWithFrontmatter,
		previewMode: "rendered",
		graphPath: "/Users/test/logseq-graph",
	},
};

/**
 * Raw markdown view - shows unprocessed markdown
 */
export const RawMode: Story = {
	args: {
		preview: sampleMarkdownWithFrontmatter,
		previewMode: "raw",
		graphPath: "/Users/test/logseq-graph",
	},
};

/**
 * Simple content without frontmatter
 */
export const SimpleContent: Story = {
	args: {
		preview: simpleMarkdown,
		previewMode: "rendered",
		graphPath: "/Users/test/logseq-graph",
	},
};

/**
 * Code-heavy content with syntax highlighting
 */
export const CodeHeavy: Story = {
	args: {
		preview: codeHeavyMarkdown,
		previewMode: "rendered",
		graphPath: "/Users/test/logseq-graph",
	},
};

/**
 * Long article with multiple sections
 */
export const LongArticle: Story = {
	args: {
		preview: longArticle,
		previewMode: "rendered",
		graphPath: "/Users/test/logseq-graph",
	},
};

/**
 * Content with images (requires local assets)
 */
export const WithImages: Story = {
	args: {
		preview: markdownWithImages,
		previewMode: "rendered",
		graphPath: "/Users/test/logseq-graph",
	},
};

/**
 * Complex formatting with tables and nested elements
 */
export const ComplexFormatting: Story = {
	args: {
		preview: complexFormatting,
		previewMode: "rendered",
		graphPath: "/Users/test/logseq-graph",
	},
};

/**
 * Empty content
 */
export const Empty: Story = {
	args: {
		preview: "",
		previewMode: "rendered",
		graphPath: "/Users/test/logseq-graph",
	},
};

/**
 * Only frontmatter, no content
 */
export const OnlyFrontmatter: Story = {
	args: {
		preview: `---
title: Empty Page
author: Test User
---`,
		previewMode: "rendered",
		graphPath: "/Users/test/logseq-graph",
	},
};
