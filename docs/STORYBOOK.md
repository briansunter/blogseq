# Storybook Setup for BlogSeq

This project includes Storybook for visual development and testing of React components.

## Quick Start

```bash
# Start Storybook development server
pnpm storybook

# Build static Storybook
pnpm build-storybook
```

Storybook runs on **http://localhost:6006**

## What's Included

### Component Stories

All major components have comprehensive stories:

- **App** (`src/components/App.stories.tsx`) - 10 stories
  - Default page load
  - Rich content with code blocks
  - Nested blocks
  - Block references
  - Frontmatter properties
  - Empty page
  - No active page
  - Long content
  - Special characters

- **ExportHeader** (`src/components/ExportHeader.stories.tsx`) - 6 stories
  - Default state
  - Exporting state
  - No active page warning
  - Long page names
  - Special characters
  - Edge cases

- **SettingsBar** (`src/components/SettingsBar.stories.tsx`) - 8 stories
  - Default settings
  - All enabled/disabled
  - Debug mode
  - Custom asset paths
  - Various configurations

- **PreviewContent** (`src/components/PreviewContent.stories.tsx`) - 9 stories
  - Rendered vs raw mode
  - Frontmatter
  - Code blocks
  - Images
  - Long articles
  - Complex formatting
  - Empty states

- **Toast** (`src/components/Toast.stories.tsx`) - 7 stories
  - Success/Error/Warning/Info types
  - Long messages
  - Multiple toasts
  - Interactive playground

### Mock Logseq SDK

The Storybook setup includes a complete mock of the Logseq SDK:

```typescript
// Automatically available in all stories
window.logseq
global.logseq

// Customize per-story:
export const MyStory: Story = {
  parameters: {
    mockLogseq: {
      setup: (mockAPI: MockLogseqAPI) => {
        const page = new PageBuilder()
          .withName("Test Page")
          .withProperty("author", "Test")
          .build();

        mockAPI.addPage(page);
        mockAPI.setCurrentPage(page);
      },
    },
  },
};
```

### Configuration

- **Vite Builder** - Fast HMR and builds
- **Tailwind CSS** - Fully integrated with project styles
- **Path Aliases** - `@/` points to `src/`
- **Dark Theme** - Default background matches BlogSeq UI
- **Toast Provider** - Automatically wrapped around stories
- **Auto-docs** - Generated from component props

## File Structure

```
.storybook/
├── main.ts          # Storybook configuration
├── preview.tsx      # Global decorators and mock setup
└── README.md        # Detailed documentation

src/components/
├── App.stories.tsx
├── ExportHeader.stories.tsx
├── SettingsBar.stories.tsx
├── PreviewContent.stories.tsx
└── Toast.stories.tsx

src/testing/
├── mock-logseq-sdk/     # Comprehensive Logseq API mocks
│   ├── MockLogseqAPI.ts
│   ├── MockFileAPI.ts
│   ├── fixtures.ts
│   └── builders.ts
└── utils/
    ├── renderWithLogseq.tsx
    └── setupLogseqTest.ts
```

## Adding New Stories

1. Create `ComponentName.stories.tsx` next to your component:

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

export const Default: Story = {
  args: {
    prop1: "value",
  },
};
```

2. Run Storybook to see your new story:

```bash
pnpm storybook
```

## Testing Workflow

Storybook complements the test suite:

- **Vitest** - Unit/integration/component tests
- **Storybook** - Visual development and manual testing
- **Together** - Complete testing coverage

Use Storybook for:
- Visual regression testing
- Component development in isolation
- Interactive prop exploration
- Documentation for component API
- Manual QA of UI states

## Documentation

For detailed information, see:
- [.storybook/README.md](./.storybook/README.md) - Complete Storybook guide
- [src/testing/mock-logseq-sdk/README.md](./src/testing/mock-logseq-sdk/README.md) - Mock SDK docs
- [src/testing/utils/README.md](./src/testing/utils/README.md) - Testing utilities

## CI/CD Integration

To add Storybook to CI:

```yaml
# .github/workflows/storybook.yml
name: Build Storybook
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build-storybook
```

## Deployment

Deploy the static build to any hosting service:

```bash
pnpm build-storybook
# Output: storybook-static/
```

Recommended hosts:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## Troubleshooting

**Stories not showing up:**
- Check file naming: `*.stories.tsx`
- Verify default export of meta object
- Restart Storybook server

**Mock SDK not working:**
- Check browser console for errors
- Verify `window.logseq` exists
- Review mock configuration in `preview.tsx`

**Styles not loading:**
- Clear cache: `rm -rf node_modules/.cache`
- Verify Tailwind CSS is configured
- Check PostCSS processing

## Resources

- [Storybook Docs](https://storybook.js.org/docs/react/get-started/introduction)
- [BlogSeq README](./README.md)
- [Testing Guide](./src/testing/README.md)
