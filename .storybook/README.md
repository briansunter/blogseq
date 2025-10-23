# Storybook for BlogSeq

This directory contains the Storybook configuration for BlogSeq, enabling visual development and testing of React components in isolation.

## Quick Start

### Running Storybook

```bash
# Start the development server
pnpm storybook

# Build static Storybook for deployment
pnpm build-storybook
```

The Storybook dev server runs on `http://localhost:6006` by default.

## Project Structure

```
.storybook/
├── main.ts          # Main Storybook configuration
├── preview.tsx      # Global decorators, parameters, and mock setup
└── README.md        # This file

src/
├── components/
│   ├── App.stories.tsx
│   ├── ExportHeader.stories.tsx
│   ├── SettingsBar.stories.tsx
│   ├── PreviewContent.stories.tsx
│   └── Toast.stories.tsx
└── testing/
    ├── mock-logseq-sdk/     # Mock Logseq API for testing
    └── utils/                # Test utilities
```

## Configuration

### Main Configuration (`main.ts`)

- **Framework**: React with Vite builder
- **Addons**: Links, Essentials, Interactions
- **Path Aliases**: `@` points to `src/` directory
- **Stories**: Auto-discovers `*.stories.tsx` files in `src/`

### Preview Configuration (`preview.tsx`)

- **Global Styles**: Imports `src/index.css` (includes Tailwind CSS)
- **Mock Logseq SDK**: Automatically injects mock Logseq API
- **Decorators**: Wraps stories with ToastProvider by default
- **Backgrounds**: Dark theme optimized for BlogSeq UI

## Writing Stories

### Basic Story Structure

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./MyComponent";

const meta = {
  title: "Components/MyComponent",
  component: MyComponent,
  parameters: {
    layout: "fullscreen", // or "centered", "padded"
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    prop1: "value1",
    prop2: true,
  },
};
```

### Using Mock Logseq SDK

The mock Logseq SDK is automatically available in all stories via the preview decorator. You can customize it per-story:

```typescript
export const CustomMockData: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        // Create pages
        const page = new PageBuilder()
          .withName("My Page")
          .withProperty("author", "Test User")
          .build();

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);

        // Create blocks
        const blocks = [
          new BlockBuilder()
            .withContent("# Heading")
            .withProperty("logseq.property/heading", 1)
            .build(),
          new BlockBuilder()
            .withContent("Content here")
            .build(),
        ];

        blocks.forEach(block => mockAPI.addBlock(block));
        mockAPI.setPageBlocks(page.uuid, blocks);
      },
    },
  },
};
```

### Available Mock Builders

**PageBuilder**
```typescript
new PageBuilder()
  .withName("Page Name")
  .withProperty("key", "value")
  .withUuid("custom-uuid")
  .build()
```

**BlockBuilder**
```typescript
new BlockBuilder()
  .withContent("Block content")
  .withProperty("logseq.property/heading", 2)
  .withUuid("custom-uuid")
  .build()
```

**AssetBuilder**
```typescript
new AssetBuilder()
  .withFileName("image.png")
  .withFullPath("/path/to/image.png")
  .withTitle("My Image")
  .build()
```

### Story Parameters

#### Disabling Toast Provider

```typescript
export const WithoutToast: Story = {
  parameters: {
    withToastProvider: false,
  },
};
```

#### Disabling Mock Reset

By default, the mock Logseq SDK resets between stories. To preserve state:

```typescript
export const PreserveMock: Story = {
  parameters: {
    mockLogseq: {
      reset: false,
    },
  },
};
```

#### Custom Layout

```typescript
export const CenteredStory: Story = {
  parameters: {
    layout: "centered", // Options: "centered", "fullscreen", "padded"
  },
};
```

## Component Story Examples

### ExportHeader

Stories covering:
- Default state with page loaded
- Export in progress
- No active page (warning state)
- Long page names
- Special characters

### SettingsBar

Stories covering:
- Default settings
- All options enabled/disabled
- Custom asset paths
- Debug mode

### PreviewContent

Stories covering:
- Rendered vs raw modes
- Frontmatter handling
- Code blocks
- Images
- Complex formatting
- Long articles

### Toast

Stories covering:
- All toast types (success, error, warning, info)
- Multiple toasts
- Long messages
- Interactive playground

### App

Stories covering:
- Default page load
- Rich content
- Nested blocks
- Block references
- Frontmatter
- Empty page
- No active page
- Long content
- Special characters

## Mock Logseq SDK Features

The mock SDK (`src/testing/mock-logseq-sdk/`) provides:

### MockLogseqAPI
- Page management (add, get, set current)
- Block management (add, get, query)
- Property definitions
- Graph configuration
- DataScript query simulation

### Fixtures
- `TestUUIDs` - Predefined UUIDs for consistency
- `SampleBlocks` - Common block patterns
- `SamplePages` - Example pages
- `SampleAssets` - Asset examples

### Builders
- Fluent API for creating test data
- Type-safe construction
- Sensible defaults

## Best Practices

### 1. Story Organization

Group related stories together:
```typescript
// Good: Clear hierarchy
export const Default: Story = { ... };
export const Loading: Story = { ... };
export const Error: Story = { ... };
export const Empty: Story = { ... };
```

### 2. Descriptive Names

Use clear, descriptive story names:
```typescript
// Good
export const LongPageName: Story = { ... };
export const ExportInProgress: Story = { ... };

// Avoid
export const Story1: Story = { ... };
export const Test: Story = { ... };
```

### 3. Document Stories

Add JSDoc comments to explain what each story demonstrates:
```typescript
/**
 * Shows the header during an active export operation.
 * The export button displays a spinner and is disabled.
 */
export const ExportInProgress: Story = { ... };
```

### 4. Test Edge Cases

Include stories for:
- Empty states
- Loading states
- Error states
- Long content
- Special characters
- Mobile viewports

### 5. Use Controls

Leverage Storybook controls for interactive testing:
```typescript
argTypes: {
  currentPageName: {
    control: "text",
    description: "Name of the page being exported",
  },
  isExporting: {
    control: "boolean",
    description: "Whether export is in progress",
  },
}
```

## Adding New Stories

### Step 1: Create the Story File

Create a new file next to your component:
```
src/components/MyComponent.tsx
src/components/MyComponent.stories.tsx  ← New file
```

### Step 2: Define the Meta Configuration

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./MyComponent";

const meta = {
  title: "Components/MyComponent",
  component: MyComponent,
  tags: ["autodocs"],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
```

### Step 3: Create Stories

```typescript
export const Default: Story = {
  args: {
    // Component props
  },
};

export const Variant: Story = {
  args: {
    // Different props
  },
};
```

### Step 4: Test in Storybook

```bash
pnpm storybook
```

Navigate to your new story in the sidebar.

## Troubleshooting

### Stories Not Appearing

1. Check file naming: Must end with `.stories.tsx`
2. Verify file location: Must be in `src/` directory
3. Check exports: Must export a default meta object
4. Restart Storybook server

### Mock Logseq SDK Not Working

1. Verify `preview.tsx` decorator is configured
2. Check that `window.logseq` is defined in browser console
3. Use the `setup` function in story parameters
4. Check MockLogseqAPI implementation

### Styles Not Loading

1. Verify `src/index.css` is imported in `preview.tsx`
2. Check Tailwind CSS is configured properly
3. Ensure PostCSS is processing styles
4. Clear Storybook cache: `rm -rf node_modules/.cache`

### TypeScript Errors

1. Install Storybook types: Already included in `@storybook/react`
2. Update `tsconfig.json` if needed
3. Restart TypeScript server in IDE

## Deployment

### Build Static Storybook

```bash
pnpm build-storybook
```

Output is in `storybook-static/` directory.

### Deploy to Hosting

**Vercel/Netlify:**
- Build command: `pnpm build-storybook`
- Publish directory: `storybook-static`

**GitHub Pages:**
```bash
pnpm build-storybook
# Deploy storybook-static/ to gh-pages branch
```

## Resources

- [Storybook Documentation](https://storybook.js.org/docs/react/get-started/introduction)
- [Storybook Best Practices](https://storybook.js.org/docs/react/writing-stories/introduction)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Mock Logseq SDK README](../src/testing/mock-logseq-sdk/README.md)

## Contributing

When adding new components:
1. Create component in `src/components/`
2. Add comprehensive stories covering all states
3. Document props with JSDoc
4. Include edge cases and error states
5. Test in Storybook before committing

## License

MIT License - Same as BlogSeq project
