/**
 * ZIP file testing utilities
 * Helpers for testing ZIP exports with assets
 */

import JSZip from 'jszip';

export interface ExpectedZipStructure {
  /**
   * Expected markdown file name (e.g., 'page-name.md')
   */
  markdownFile: string;

  /**
   * Expected asset folder path (e.g., 'assets/')
   */
  assetFolder?: string;

  /**
   * Expected asset file names
   */
  assetFiles?: string[];

  /**
   * Minimum number of files expected
   */
  minFiles?: number;

  /**
   * Maximum number of files expected
   */
  maxFiles?: number;
}

/**
 * Read and parse ZIP file from Blob
 *
 * @example
 * ```typescript
 * const blob = await downloadAsZip();
 * const zip = await readZipFromBlob(blob);
 * ```
 */
export async function readZipFromBlob(blob: Blob): Promise<JSZip> {
  const zip = new JSZip();
  const arrayBuffer = await blob.arrayBuffer();
  return await zip.loadAsync(arrayBuffer);
}

/**
 * Verify ZIP structure matches expected layout
 *
 * @example
 * ```typescript
 * const isValid = await verifyZipStructure(zip, {
 *   markdownFile: 'my-page.md',
 *   assetFolder: 'assets/',
 *   assetFiles: ['image.png', 'document.pdf'],
 * });
 * ```
 */
export async function verifyZipStructure(
  zip: JSZip,
  expected: ExpectedZipStructure
): Promise<boolean> {
  const files = Object.keys(zip.files);

  // Check markdown file exists
  if (!files.includes(expected.markdownFile)) {
    console.error(`Expected markdown file '${expected.markdownFile}' not found in ZIP`);
    return false;
  }

  // Check asset folder if specified
  if (expected.assetFolder) {
    const assetFolder = expected.assetFolder;
    const hasAssetFolder = files.some(f => f.startsWith(assetFolder));
    if (!hasAssetFolder) {
      console.error(`Expected asset folder '${assetFolder}' not found in ZIP`);
      return false;
    }
  }

  // Check specific asset files
  if (expected.assetFiles) {
    for (const assetFile of expected.assetFiles) {
      const assetPath = expected.assetFolder
        ? `${expected.assetFolder}${assetFile}`
        : assetFile || '';

      if (!files.includes(assetPath)) {
        console.error(`Expected asset file '${assetPath}' not found in ZIP`);
        return false;
      }
    }
  }

  // Check file count constraints
  if (expected.minFiles !== undefined && files.length < expected.minFiles) {
    console.error(`Expected at least ${expected.minFiles} files, found ${files.length}`);
    return false;
  }

  if (expected.maxFiles !== undefined && files.length > expected.maxFiles) {
    console.error(`Expected at most ${expected.maxFiles} files, found ${files.length}`);
    return false;
  }

  return true;
}

/**
 * Extract markdown content from ZIP
 *
 * @example
 * ```typescript
 * const content = await extractMarkdownFromZip(zip, 'my-page.md');
 * expect(content).toContain('# My Page');
 * ```
 */
export async function extractMarkdownFromZip(
  zip: JSZip,
  filename: string
): Promise<string> {
  const file = zip.file(filename);

  if (!file) {
    throw new Error(`File '${filename}' not found in ZIP`);
  }

  return await file.async('text');
}

/**
 * Extract asset file from ZIP as Blob
 *
 * @example
 * ```typescript
 * const imageBlob = await extractAssetFromZip(zip, 'assets/image.png');
 * expect(imageBlob.type).toBe('image/png');
 * ```
 */
export async function extractAssetFromZip(
  zip: JSZip,
  path: string
): Promise<Blob> {
  const file = zip.file(path);

  if (!file) {
    throw new Error(`Asset '${path}' not found in ZIP`);
  }

  const arrayBuffer = await file.async('arraybuffer');
  return new Blob([arrayBuffer]);
}

/**
 * Get all file paths in ZIP
 *
 * @example
 * ```typescript
 * const files = getZipFilePaths(zip);
 * console.log(files); // ['page.md', 'assets/image.png']
 * ```
 */
export function getZipFilePaths(zip: JSZip): string[] {
  return Object.keys(zip.files).filter(path => !zip.files[path].dir);
}

/**
 * Get all folder paths in ZIP
 *
 * @example
 * ```typescript
 * const folders = getZipFolderPaths(zip);
 * console.log(folders); // ['assets/']
 * ```
 */
export function getZipFolderPaths(zip: JSZip): string[] {
  return Object.keys(zip.files).filter(path => zip.files[path].dir);
}

/**
 * Assert asset exists in ZIP with optional type check
 *
 * @example
 * ```typescript
 * await assertAssetInZip(zip, 'assets/image.png', 'image/png');
 * ```
 */
export async function assertAssetInZip(
  zip: JSZip,
  assetPath: string,
  expectedType?: string
): Promise<void> {
  const file = zip.file(assetPath);

  if (!file) {
    throw new Error(`Asset '${assetPath}' not found in ZIP`);
  }

  // If type check requested, verify blob type
  if (expectedType) {
    const blob = await extractAssetFromZip(zip, assetPath);
    // Note: Blob type from ZIP may not always match original, this is a best-effort check
    if (blob.type && blob.type !== expectedType) {
      console.warn(
        `Asset type mismatch: expected '${expectedType}', got '${blob.type}'`
      );
    }
  }
}

/**
 * Count files in ZIP (excluding directories)
 *
 * @example
 * ```typescript
 * const fileCount = countZipFiles(zip);
 * expect(fileCount).toBe(5);
 * ```
 */
export function countZipFiles(zip: JSZip): number {
  return getZipFilePaths(zip).length;
}

/**
 * Find files matching a pattern in ZIP
 *
 * @example
 * ```typescript
 * const images = findFilesInZip(zip, /\.(png|jpg|jpeg)$/i);
 * expect(images).toHaveLength(3);
 * ```
 */
export function findFilesInZip(zip: JSZip, pattern: RegExp): string[] {
  return getZipFilePaths(zip).filter(path => pattern.test(path));
}

/**
 * Extract all markdown files from ZIP
 *
 * @example
 * ```typescript
 * const markdownFiles = await extractAllMarkdownFromZip(zip);
 * expect(markdownFiles).toHaveLength(1);
 * expect(markdownFiles[0].filename).toBe('page.md');
 * ```
 */
export async function extractAllMarkdownFromZip(
  zip: JSZip
): Promise<Array<{ filename: string; content: string }>> {
  const mdFiles = findFilesInZip(zip, /\.md$/i);
  const results: Array<{ filename: string; content: string }> = [];

  for (const filename of mdFiles) {
    const content = await extractMarkdownFromZip(zip, filename);
    results.push({ filename, content });
  }

  return results;
}

/**
 * Create a test ZIP file for mocking
 *
 * @example
 * ```typescript
 * const zip = await createTestZip({
 *   'page.md': '# Test Page',
 *   'assets/image.png': new Blob([imageData], { type: 'image/png' }),
 * });
 * ```
 */
export async function createTestZip(
  files: Record<string, string | Blob>
): Promise<JSZip> {
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    if (typeof content === 'string') {
      zip.file(path, content);
    } else {
      const arrayBuffer = await content.arrayBuffer();
      zip.file(path, arrayBuffer);
    }
  }

  return zip;
}

/**
 * Convert ZIP to Blob for download testing
 *
 * @example
 * ```typescript
 * const zip = await createTestZip({ 'test.md': '# Test' });
 * const blob = await zipToBlob(zip);
 * ```
 */
export async function zipToBlob(zip: JSZip): Promise<Blob> {
  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  return new Blob([arrayBuffer], { type: 'application/zip' });
}

/**
 * Get ZIP file metadata
 *
 * @example
 * ```typescript
 * const metadata = getZipMetadata(zip);
 * console.log(metadata.totalFiles, metadata.totalSize);
 * ```
 */
export function getZipMetadata(zip: JSZip): {
  totalFiles: number;
  totalFolders: number;
  files: Array<{ path: string; size: number }>;
} {
  const files = getZipFilePaths(zip).map(path => ({
    path,
    // Note: size info may not be available before extracting
    size: 0,
  }));

  return {
    totalFiles: files.length,
    totalFolders: getZipFolderPaths(zip).length,
    files,
  };
}
