import { FileAPI } from '../../markdownExporter';

/**
 * Mock implementation of FileAPI
 *
 * This class provides a configurable mock of file operations for testing.
 * It tracks all calls and provides utilities for simulating file operations.
 */
export class MockFileAPI implements FileAPI {
  // Call tracking
  public calls = {
    fetch: [] as string[],
    saveAs: [] as Array<{ blob: Blob; filename: string }>,
    createObjectURL: [] as Blob[],
    revokeObjectURL: [] as string[],
    writeToClipboard: [] as string[],
  };

  // Mock storage
  private objectURLs = new Map<Blob, string>();
  private fileResponses = new Map<string, Response>();
  private clipboardContent = '';
  private nextObjectURLId = 0;

  /**
   * Fetch a file
   */
  async fetch(url: string): Promise<Response> {
    this.calls.fetch.push(url);

    // Check if a custom response is configured
    const response = this.fileResponses.get(url);
    if (response) {
      return response;
    }

    // Default: return a successful empty response for file:// URLs
    if (url.startsWith('file://')) {
      return this.createMockResponse('', 200);
    }

    // For other URLs, return 404
    return this.createMockResponse('Not Found', 404);
  }

  /**
   * Save a blob as a file
   */
  saveAs(blob: Blob, filename: string): void {
    this.calls.saveAs.push({ blob, filename });
  }

  /**
   * Create an object URL for a blob
   */
  createObjectURL(blob: Blob): string {
    this.calls.createObjectURL.push(blob);

    const url = `blob:mock-${this.nextObjectURLId++}`;
    this.objectURLs.set(blob, url);
    return url;
  }

  /**
   * Revoke an object URL
   */
  revokeObjectURL(url: string): void {
    this.calls.revokeObjectURL.push(url);

    // Find and remove the blob associated with this URL
    for (const [blob, blobUrl] of this.objectURLs) {
      if (blobUrl === url) {
        this.objectURLs.delete(blob);
        break;
      }
    }
  }

  /**
   * Write text to the clipboard
   */
  async writeToClipboard(text: string): Promise<void> {
    this.calls.writeToClipboard.push(text);
    this.clipboardContent = text;
  }

  // Configuration methods

  /**
   * Configure a mock response for a specific URL
   */
  setFetchResponse(url: string, response: Response | string | Blob, status = 200): this {
    if (response instanceof Response) {
      this.fileResponses.set(url, response);
    } else {
      const blob = response instanceof Blob ? response : new Blob([response]);
      this.fileResponses.set(url, this.createMockResponse(blob, status));
    }
    return this;
  }

  /**
   * Configure multiple fetch responses at once
   */
  setFetchResponses(responses: Record<string, Response | string | Blob>): this {
    for (const [url, response] of Object.entries(responses)) {
      this.setFetchResponse(url, response);
    }
    return this;
  }

  /**
   * Simulate a fetch error for a specific URL
   */
  setFetchError(url: string, error: Error = new Error('Fetch failed')): this {
    this.fileResponses.set(url, {
      ok: false,
      status: 500,
      statusText: 'Error',
      blob: async () => {
        throw error;
      },
      text: async () => {
        throw error;
      },
      json: async () => {
        throw error;
      },
      headers: new Headers(),
      redirected: false,
      type: 'error',
      url,
      clone: function () {
        return this;
      },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => {
        throw error;
      },
      formData: async () => {
        throw error;
      },
      bytes: async () => {
        throw error;
      },
    } as Response);
    return this;
  }

  /**
   * Simulate a clipboard write error
   */
  throwErrorOnClipboard(error: Error = new Error('Clipboard error')): this {
    this.writeToClipboard = async (text: string) => {
      this.calls.writeToClipboard.push(text);
      throw error;
    };
    return this;
  }

  // Inspection methods

  /**
   * Get the current clipboard content
   */
  getClipboardContent(): string {
    return this.clipboardContent;
  }

  /**
   * Get all created object URLs
   */
  getObjectURLs(): Map<Blob, string> {
    return new Map(this.objectURLs);
  }

  /**
   * Get saved files
   */
  getSavedFiles(): Array<{ blob: Blob; filename: string }> {
    return [...this.calls.saveAs];
  }

  /**
   * Get the last saved file
   */
  getLastSavedFile(): { blob: Blob; filename: string } | undefined {
    return this.calls.saveAs[this.calls.saveAs.length - 1];
  }

  /**
   * Read content from a saved blob
   */
  async readSavedBlobContent(index = -1): Promise<string> {
    const savedFile =
      index < 0 ? this.calls.saveAs[this.calls.saveAs.length + index] : this.calls.saveAs[index];

    if (!savedFile) {
      throw new Error('No saved file at index ' + index);
    }

    return savedFile.blob.text();
  }

  /**
   * Check if a URL was fetched
   */
  wasFetched(url: string): boolean {
    return this.calls.fetch.includes(url);
  }

  /**
   * Check if a file was saved with a specific name
   */
  wasSavedAs(filename: string): boolean {
    return this.calls.saveAs.some(f => f.filename === filename);
  }

  // Reset methods

  /**
   * Reset all state
   */
  reset(): this {
    this.resetCalls();
    this.objectURLs.clear();
    this.fileResponses.clear();
    this.clipboardContent = '';
    this.nextObjectURLId = 0;
    return this;
  }

  /**
   * Reset call tracking
   */
  resetCalls(): this {
    this.calls = {
      fetch: [],
      saveAs: [],
      createObjectURL: [],
      revokeObjectURL: [],
      writeToClipboard: [],
    };
    return this;
  }

  // Helper methods

  /**
   * Create a mock Response object
   */
  private createMockResponse(data: Blob | string, status = 200): Response {
    const blob = data instanceof Blob ? data : new Blob([data]);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      blob: async () => blob,
      text: async () => blob.text(),
      json: async () => JSON.parse(await blob.text()),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: function () {
        return this;
      },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
      bytes: async () => new Uint8Array(0),
    } as Response;
  }

  /**
   * Create a mock Blob for testing
   */
  static createBlob(content: string, type = 'text/plain'): Blob {
    return new Blob([content], { type });
  }

  /**
   * Create a mock Response for testing
   */
  static createResponse(data: string | Blob, status = 200): Response {
    const blob = data instanceof Blob ? data : new Blob([data]);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      blob: async () => blob,
      text: async () => blob.text(),
      json: async () => JSON.parse(await blob.text()),
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: function () {
        return this;
      },
      body: null,
      bodyUsed: false,
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
      bytes: async () => new Uint8Array(0),
    } as Response;
  }
}
