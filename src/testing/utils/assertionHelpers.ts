/**
 * Custom assertion helpers for testing
 * Provides domain-specific assertions with clear error messages
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'vitest';
import type { BlockEntity } from '@logseq/libs/dist/LSPlugin';
import type { MockLogseqAPI } from '../mock-logseq-sdk';

/**
 * Expected markdown structure for assertions
 */
export interface ExpectedMarkdownStructure {
  /**
   * Should have YAML frontmatter
   */
  hasFrontmatter?: boolean;

  /**
   * Should have specific heading text
   */
  hasHeading?: string;

  /**
   * Should contain specific content
   */
  hasContent?: string;

  /**
   * Should have link to specific asset
   */
  hasAssetLink?: string;

  /**
   * Should NOT contain specific content
   */
  doesNotContain?: string;

  /**
   * Should match regex pattern
   */
  matchesPattern?: RegExp;

  /**
   * Should have specific property in frontmatter
   */
  hasFrontmatterProperty?: { key: string; value: any };

  /**
   * Line count constraints
   */
  minLines?: number;
  maxLines?: number;
}

/**
 * Assert markdown structure matches expectations
 *
 * @example
 * ```typescript
 * assertMarkdownStructure(markdown, {
 *   hasFrontmatter: true,
 *   hasHeading: 'My Page',
 *   hasAssetLink: 'image.png',
 * });
 * ```
 */
export function assertMarkdownStructure(
  markdown: string,
  expected: ExpectedMarkdownStructure
): void {
  const lines = markdown.split('\n');

  // Check frontmatter
  if (expected.hasFrontmatter !== undefined) {
    const hasFrontmatter = markdown.startsWith('---\n') && markdown.includes('\n---\n');
    expect(hasFrontmatter, 'Expected frontmatter to be present').toBe(expected.hasFrontmatter);
  }

  // Check heading
  if (expected.hasHeading) {
    const headingRegex = new RegExp(`^#+\\s+${expected.hasHeading}`, 'm');
    expect(markdown, `Expected to find heading: ${expected.hasHeading}`).toMatch(headingRegex);
  }

  // Check content
  if (expected.hasContent) {
    expect(markdown, `Expected to contain: ${expected.hasContent}`).toContain(expected.hasContent);
  }

  // Check asset link
  if (expected.hasAssetLink) {
    const assetLinkRegex = new RegExp(`!?\\[.*?\\]\\(.*?${expected.hasAssetLink}.*?\\)`);
    expect(markdown, `Expected to find asset link: ${expected.hasAssetLink}`).toMatch(
      assetLinkRegex
    );
  }

  // Check does not contain
  if (expected.doesNotContain) {
    expect(markdown, `Expected NOT to contain: ${expected.doesNotContain}`).not.toContain(
      expected.doesNotContain
    );
  }

  // Check pattern match
  if (expected.matchesPattern) {
    expect(markdown, `Expected to match pattern: ${expected.matchesPattern}`).toMatch(
      expected.matchesPattern
    );
  }

  // Check frontmatter property
  if (expected.hasFrontmatterProperty) {
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found to check properties');
    }

    const frontmatter = frontmatterMatch[1];
    const { key, value } = expected.hasFrontmatterProperty;
    const propertyRegex = new RegExp(`^${key}:\\s*(.*)$`, 'm');
    const match = frontmatter.match(propertyRegex);

    expect(match, `Expected frontmatter property '${key}' to exist`).toBeTruthy();

    if (match) {
      const actualValue = match[1].trim();
      const expectedValue = typeof value === 'string' ? value : JSON.stringify(value);
      expect(
        actualValue,
        `Expected frontmatter property '${key}' to equal '${expectedValue}'`
      ).toBe(expectedValue);
    }
  }

  // Check line count
  if (expected.minLines !== undefined) {
    expect(lines.length, `Expected at least ${expected.minLines} lines`).toBeGreaterThanOrEqual(
      expected.minLines
    );
  }

  if (expected.maxLines !== undefined) {
    expect(lines.length, `Expected at most ${expected.maxLines} lines`).toBeLessThanOrEqual(
      expected.maxLines
    );
  }
}

/**
 * Assert block tree structure has expected depth
 *
 * @example
 * ```typescript
 * assertBlockTree(blocks, 3); // Expects tree with depth of 3
 * ```
 */
export function assertBlockTree(blocks: BlockEntity[], expectedDepth: number): void {
  function calculateDepth(block: BlockEntity | any, currentDepth = 1): number {
    if (!block.children || block.children.length === 0) {
      return currentDepth;
    }

    const childDepths = block.children.map((child: BlockEntity | any) =>
      calculateDepth(child, currentDepth + 1)
    );
    return Math.max(...childDepths);
  }

  // Find root blocks (no parent)
  const rootBlocks = blocks.filter(b => !b.parent);

  if (rootBlocks.length === 0) {
    throw new Error('No root blocks found in tree');
  }

  const maxDepth = Math.max(...rootBlocks.map(block => calculateDepth(block)));

  expect(maxDepth, `Expected block tree depth to be ${expectedDepth}`).toBe(expectedDepth);
}

/**
 * Assert value is a valid UUID
 *
 * @example
 * ```typescript
 * assertIsUuid(block.uuid);
 * ```
 */
export function assertIsUuid(value: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const isValidFormat = uuidRegex.test(value) || /^[0-9a-f]{8,}$/i.test(value);

  expect(isValidFormat, `Expected '${value}' to be a valid UUID format`).toBe(true);
}

/**
 * Assert Logseq API method was called
 *
 * @example
 * ```typescript
 * assertLogseqAPICalled(mockAPI, 'getPage', 1);
 * ```
 */
export function assertLogseqAPICalled(
  mockAPI: MockLogseqAPI,
  method: keyof MockLogseqAPI['calls'],
  times?: number
): void {
  const calls = mockAPI.calls[method];

  if (!calls) {
    throw new Error(`Method '${method}' not found in mock API call history`);
  }

  if (times !== undefined) {
    expect(calls, `Expected '${method}' to be called ${times} time(s)`).toHaveLength(times);
  } else {
    expect(calls.length, `Expected '${method}' to have been called`).toBeGreaterThan(0);
  }
}

/**
 * Assert Logseq API method was called with specific arguments
 *
 * @example
 * ```typescript
 * assertLogseqAPICalledWith(mockAPI, 'getPage', 'My Page');
 * ```
 */
export function assertLogseqAPICalledWith(
  mockAPI: MockLogseqAPI,
  method: keyof MockLogseqAPI['calls'],
  expectedArg: any
): void {
  const calls = mockAPI.calls[method];

  if (!calls) {
    throw new Error(`Method '${method}' not found in mock API call history`);
  }

  const found = calls.some(callArg => {
    if (typeof callArg === 'object' && callArg !== null) {
      return JSON.stringify(callArg) === JSON.stringify(expectedArg);
    }
    return callArg === expectedArg;
  });

  expect(found, `Expected '${method}' to be called with: ${JSON.stringify(expectedArg)}`).toBe(
    true
  );
}

/**
 * Assert block has specific property
 *
 * @example
 * ```typescript
 * assertBlockHasProperty(block, 'heading', 2);
 * ```
 */
export function assertBlockHasProperty(
  block: BlockEntity,
  propertyKey: string,
  expectedValue?: any
): void {
  const hasProperty = block.properties && propertyKey in block.properties;

  expect(hasProperty, `Expected block to have property '${propertyKey}'`).toBe(true);

  if (expectedValue !== undefined && block.properties) {
    expect(
      block.properties[propertyKey],
      `Expected property '${propertyKey}' to equal ${expectedValue}`
    ).toBe(expectedValue);
  }
}

/**
 * Assert markdown has valid frontmatter YAML
 *
 * @example
 * ```typescript
 * assertValidFrontmatter(markdown);
 * ```
 */
export function assertValidFrontmatter(markdown: string): Record<string, any> {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);

  expect(frontmatterMatch, 'Expected valid frontmatter block').toBeTruthy();

  if (!frontmatterMatch) {
    throw new Error('No frontmatter found');
  }

  const frontmatter = frontmatterMatch[1];

  // Basic YAML validation (key: value format)
  const lines = frontmatter.split('\n').filter(line => line.trim());
  const parsed: Record<string, any> = {};

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      parsed[match[1]] = match[2];
    }
  }

  expect(Object.keys(parsed).length, 'Expected frontmatter to have properties').toBeGreaterThan(0);

  return parsed;
}

/**
 * Assert markdown does not contain Logseq-specific syntax
 *
 * @example
 * ```typescript
 * assertCleanMarkdown(markdown);
 * ```
 */
export function assertCleanMarkdown(markdown: string): void {
  const logseqPatterns = [
    /\(\([0-9a-f-]+\)\)/i, // Block references ((uuid))
    /id::\s*[0-9a-f-]+/i, // ID property
    /collapsed::\s*(true|false)/i, // Collapsed property
  ];

  for (const pattern of logseqPatterns) {
    expect(markdown, `Expected clean markdown without pattern: ${pattern}`).not.toMatch(pattern);
  }
}

/**
 * Assert content has expected heading levels
 *
 * @example
 * ```typescript
 * assertHeadingLevels(markdown, [1, 2, 2, 3]);
 * ```
 */
export function assertHeadingLevels(markdown: string, expectedLevels: number[]): void {
  const headingRegex = /^(#{1,6})\s+/gm;
  const matches = Array.from(markdown.matchAll(headingRegex));
  const actualLevels = matches.map(match => match[1].length);

  expect(
    actualLevels,
    `Expected heading levels ${expectedLevels.join(', ')}, got ${actualLevels.join(', ')}`
  ).toEqual(expectedLevels);
}

/**
 * Assert content has expected number of blocks/paragraphs
 *
 * @example
 * ```typescript
 * assertBlockCount(markdown, 5);
 * ```
 */
export function assertBlockCount(markdown: string, expectedCount: number): void {
  // Remove frontmatter if present
  const content = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');

  // Count non-empty lines/paragraphs
  const blocks = content.split('\n\n').filter(block => block.trim().length > 0);

  expect(blocks.length, `Expected ${expectedCount} blocks`).toBe(expectedCount);
}

/**
 * Assert asset path is correctly formatted
 *
 * @example
 * ```typescript
 * assertAssetPath('assets/image.png', 'assets/');
 * ```
 */
export function assertAssetPath(actualPath: string, expectedPrefix: string): void {
  expect(actualPath, `Expected asset path to start with '${expectedPrefix}'`).toMatch(
    new RegExp(`^${expectedPrefix}`)
  );
}
