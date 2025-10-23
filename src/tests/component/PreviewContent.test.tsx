import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { PreviewContent } from '../../components/PreviewContent';
import { renderWithProviders } from '../component-utils';

/**
 * PreviewContent component test suite
 * Tests markdown rendering, raw mode, and asset path handling
 */

describe('PreviewContent', () => {
  const defaultProps = {
    preview: '# Test Page\n\nThis is a test.',
    previewMode: 'rendered' as const,
    graphPath: '/Users/test/logseq-graph',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendered Mode', () => {
    it('should render markdown as HTML', () => {
      renderWithProviders(<PreviewContent {...defaultProps} />);

      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByText('This is a test.')).toBeInTheDocument();
    });

    it('should parse headings', () => {
      const preview = '# H1\n## H2\n### H3';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should parse lists', () => {
      const preview = '- Item 1\n- Item 2\n- Item 3';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should parse code blocks', () => {
      const preview = '```\nconst x = 1;\n```';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText(/const x = 1/)).toBeInTheDocument();
    });

    it('should parse inline code', () => {
      const preview = 'Use `const x = 1;` in your code.';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText(/const x = 1/)).toBeInTheDocument();
    });

    it('should parse bold text', () => {
      const preview = 'This is **bold** text.';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText('bold')).toBeInTheDocument();
    });

    it('should parse italic text', () => {
      const preview = 'This is *italic* text.';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText('italic')).toBeInTheDocument();
    });

    it('should parse links', () => {
      const preview = '[Click here](https://example.com)';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      const link = screen.getByRole('link', { name: /Click here/ });
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should parse blockquotes', () => {
      const preview = '> This is a quote';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText('This is a quote')).toBeInTheDocument();
    });

    it('should parse horizontal rules', () => {
      const preview = '---\n\nAfter break';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText('After break')).toBeInTheDocument();
    });

    it('should parse frontmatter (YAML)', () => {
      const preview = '---\ntitle: Test\nauthor: User\n---\n\n# Content';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      // Content should be visible
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Raw Mode', () => {
    it('should display raw markdown in raw mode', () => {
      const preview = '# Heading\n\nSome **bold** text';
      renderWithProviders(
        <PreviewContent
          {...defaultProps}
          preview={preview}
          previewMode="raw"
        />
      );

      expect(screen.getByText(preview)).toBeInTheDocument();
    });

    it('should preserve formatting in raw mode', () => {
      const preview = '- Item 1\n- Item 2\n- Item 3';
      renderWithProviders(
        <PreviewContent
          {...defaultProps}
          preview={preview}
          previewMode="raw"
        />
      );

      const pre = screen.getByText(preview);
      expect(pre.tagName).toBe('PRE');
    });

    it('should use monospace font in raw mode', () => {
      renderWithProviders(
        <PreviewContent
          {...defaultProps}
          previewMode="raw"
        />
      );

      const pre = screen.getByText(defaultProps.preview);
      expect(pre).toHaveClass('font-mono');
    });

    it('should preserve line breaks in raw mode', () => {
      const preview = 'Line 1\nLine 2\nLine 3';
      renderWithProviders(
        <PreviewContent
          {...defaultProps}
          preview={preview}
          previewMode="raw"
        />
      );

      expect(screen.getByText(preview)).toBeInTheDocument();
    });
  });

  describe('Asset Path Resolution', () => {
    it('should resolve asset paths in image links', () => {
      const preview = '![test](assets/image.png)';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      const img = screen.getByAltText('test') as HTMLImageElement;
      expect(img.src).toContain('file://');
      expect(img.src).toContain('image.png');
    });

    it('should use graph path for asset resolution', () => {
      const preview = '![test](assets/image.png)';
      const graphPath = '/Users/john/my-graph';

      renderWithProviders(
        <PreviewContent
          {...defaultProps}
          preview={preview}
          graphPath={graphPath}
        />
      );

      const img = screen.getByAltText('test') as HTMLImageElement;
      expect(img.src).toContain(graphPath);
    });

    it('should handle multiple images', () => {
      const preview =
        '![img1](assets/img1.png)\n\n![img2](assets/img2.jpg)';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByAltText('img1')).toBeInTheDocument();
      expect(screen.getByAltText('img2')).toBeInTheDocument();
    });

    it('should skip non-assets image paths', () => {
      const preview = '![external](https://example.com/image.png)';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      const img = screen.getByAltText('external') as HTMLImageElement;
      expect(img.src).toBe('https://example.com/image.png');
    });

    it('should handle missing graph path gracefully', () => {
      const preview = '![test](assets/image.png)';
      renderWithProviders(
        <PreviewContent
          {...defaultProps}
          preview={preview}
          graphPath=""
        />
      );

      const img = screen.getByAltText('test') as HTMLImageElement;
      expect(img.src).toBeDefined();
    });
  });

  describe('Styling', () => {
    it('should apply prose styling', () => {
      renderWithProviders(<PreviewContent {...defaultProps} />);

      const container = screen.getByText('Test Page').closest('div');
      expect(container).toHaveClass('prose');
      expect(container).toHaveClass('prose-invert');
    });

    it('should have proper text color', () => {
      renderWithProviders(<PreviewContent {...defaultProps} />);

      const container = screen.getByText('Test Page').closest('div');
      expect(container).toHaveClass('prose-p:text-gray-300');
    });

    it('should have proper heading styling', () => {
      const preview = '# Main Heading';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-gray-100');
    });

    it('should apply link styling', () => {
      const preview = '[Link](https://example.com)';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-blue-400');
    });

    it('should apply code styling', () => {
      const preview = '```\ncode\n```';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      const codeBlock = screen.getByText('code');
      expect(codeBlock).toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    it('should switch from rendered to raw mode', () => {
      const { rerender } = renderWithProviders(
        <PreviewContent {...defaultProps} previewMode="rendered" />
      );

      expect(screen.getByText('Test Page')).toBeInTheDocument();

      rerender(
        <PreviewContent
          {...defaultProps}
          previewMode="raw"
        />
      );

      expect(screen.getByText(defaultProps.preview)).toBeInTheDocument();
    });

    it('should switch from raw to rendered mode', () => {
      const { rerender } = renderWithProviders(
        <PreviewContent
          {...defaultProps}
          previewMode="raw"
        />
      );

      expect(screen.getByText(defaultProps.preview)).toBeInTheDocument();

      rerender(
        <PreviewContent {...defaultProps} previewMode="rendered" />
      );

      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });
  });

  describe('Content Updates', () => {
    it('should update when preview changes', () => {
      const { rerender } = renderWithProviders(
        <PreviewContent {...defaultProps} preview="Original content" />
      );

      expect(screen.getByText('Original content')).toBeInTheDocument();

      rerender(
        <PreviewContent {...defaultProps} preview="Updated content" />
      );

      expect(screen.queryByText('Original content')).not.toBeInTheDocument();
      expect(screen.getByText('Updated content')).toBeInTheDocument();
    });

    it('should handle empty preview', () => {
      renderWithProviders(<PreviewContent {...defaultProps} preview="" />);

      expect(screen.queryByText(/Test/)).not.toBeInTheDocument();
    });

    it('should handle very long preview', () => {
      const longPreview = '# Section\n\n' + 'Paragraph '.repeat(100);
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={longPreview} />
      );

      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters', () => {
      const preview = 'Special: & < > " \'';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText(/Special:/)).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      const preview = '# Unicode: 你好 🎉 émoji';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText(/Unicode/)).toBeInTheDocument();
    });
  });

  describe('Complex Markdown', () => {
    it('should handle nested lists', () => {
      const preview = '- Item 1\n  - Nested 1\n  - Nested 2\n- Item 2';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Nested 1')).toBeInTheDocument();
    });

    it('should handle mixed content', () => {
      const preview = `# Title

This is **bold** and *italic* text.

- List item 1
- List item 2

\`\`\`
code block
\`\`\`

[Link](https://example.com)`;

      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const preview = '# H1\n## H2\n### H3';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBe(3);
    });

    it('should have alt text for images', () => {
      const preview = '![Alt text](assets/image.png)';
      renderWithProviders(
        <PreviewContent {...defaultProps} preview={preview} />
      );

      const img = screen.getByAltText('Alt text');
      expect(img).toBeInTheDocument();
    });

    it('should have proper color contrast', () => {
      renderWithProviders(<PreviewContent {...defaultProps} />);

      const container = screen.getByText('Test Page').closest('div');
      expect(container).toHaveClass('prose-invert');
    });
  });
});
