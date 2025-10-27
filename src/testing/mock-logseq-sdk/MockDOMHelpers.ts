import { DOMHelpers } from '../../markdownExporter';

/**
 * Mock HTMLElement for testing
 */
interface MockHTMLElement {
  tagName: string;
  href?: string;
  download?: string;
  style: Record<string, string>;
  click: () => void;
  [key: string]: unknown;
}

/**
 * Mock implementation of DOMHelpers
 *
 * This class provides a configurable mock of DOM operations for testing.
 * It tracks all calls and maintains a virtual DOM tree.
 */
export class MockDOMHelpers implements DOMHelpers {
  // Call tracking
  public calls = {
    createElement: [] as string[],
    appendChild: [] as HTMLElement[],
    removeChild: [] as HTMLElement[],
  };

  // Mock DOM storage
  private elements: MockHTMLElement[] = [];
  private appendedElements: MockHTMLElement[] = [];
  private clickHandlers = new Map<MockHTMLElement, () => void>();

  /**
   * Create a mock element
   */
  createElement(tagName: string): HTMLElement {
    this.calls.createElement.push(tagName);

    const element: MockHTMLElement = {
      tagName: tagName.toUpperCase(),
      style: {},
      click: () => {
        const handler = this.clickHandlers.get(element);
        if (handler) {
          handler();
        }
      },
    };

    this.elements.push(element);
    return element as unknown as HTMLElement;
  }

  /**
   * Append an element to the body
   */
  appendChild(element: HTMLElement): void {
    this.calls.appendChild.push(element);
    this.appendedElements.push(element as unknown as MockHTMLElement);
  }

  /**
   * Remove an element from the body
   */
  removeChild(element: HTMLElement): void {
    this.calls.removeChild.push(element);

    const index = this.appendedElements.indexOf(element as unknown as MockHTMLElement);
    if (index !== -1) {
      this.appendedElements.splice(index, 1);
    }
  }

  // Configuration methods

  /**
   * Configure a click handler for an element
   */
  setClickHandler(element: HTMLElement, handler: () => void): this {
    this.clickHandlers.set(element as unknown as MockHTMLElement, handler);
    return this;
  }

  /**
   * Simulate clicking an element
   */
  clickElement(element: HTMLElement): this {
    const mockElement = element as unknown as MockHTMLElement;
    mockElement.click();
    return this;
  }

  /**
   * Simulate clicking the last created element
   */
  clickLastElement(): this {
    const lastElement = this.elements[this.elements.length - 1];
    if (lastElement) {
      lastElement.click();
    }
    return this;
  }

  // Inspection methods

  /**
   * Get all created elements
   */
  getCreatedElements(): MockHTMLElement[] {
    return [...this.elements];
  }

  /**
   * Get all currently appended elements
   */
  getAppendedElements(): MockHTMLElement[] {
    return [...this.appendedElements];
  }

  /**
   * Get the last created element
   */
  getLastCreatedElement(): MockHTMLElement | undefined {
    return this.elements[this.elements.length - 1];
  }

  /**
   * Get the last appended element
   */
  getLastAppendedElement(): MockHTMLElement | undefined {
    return this.appendedElements[this.appendedElements.length - 1];
  }

  /**
   * Get elements by tag name
   */
  getElementsByTagName(tagName: string): MockHTMLElement[] {
    const upperTagName = tagName.toUpperCase();
    return this.elements.filter(el => el.tagName === upperTagName);
  }

  /**
   * Check if an element was created
   */
  wasCreated(tagName: string): boolean {
    return this.calls.createElement.includes(tagName);
  }

  /**
   * Check if an element was appended
   */
  wasAppended(element: HTMLElement): boolean {
    return this.appendedElements.includes(element as unknown as MockHTMLElement);
  }

  /**
   * Check if an element was removed
   */
  wasRemoved(element: HTMLElement): boolean {
    return this.calls.removeChild.includes(element);
  }

  /**
   * Count how many times a tag was created
   */
  countCreated(tagName: string): number {
    return this.calls.createElement.filter(tag => tag === tagName).length;
  }

  /**
   * Get anchor element properties (for download testing)
   */
  getAnchorProperties(element: HTMLElement): {
    href?: string;
    download?: string;
    style: Record<string, string>;
  } | null {
    const mockElement = element as unknown as MockHTMLElement;
    if (mockElement.tagName !== 'A') {
      return null;
    }

    return {
      href: mockElement.href,
      download: mockElement.download,
      style: { ...mockElement.style },
    };
  }

  /**
   * Get all anchor elements created
   */
  getAnchors(): Array<{
    element: MockHTMLElement;
    href?: string;
    download?: string;
  }> {
    return this.getElementsByTagName('a').map(el => ({
      element: el,
      href: el.href,
      download: el.download,
    }));
  }

  // Reset methods

  /**
   * Reset all state
   */
  reset(): this {
    this.resetCalls();
    this.elements = [];
    this.appendedElements = [];
    this.clickHandlers.clear();
    return this;
  }

  /**
   * Reset call tracking
   */
  resetCalls(): this {
    this.calls = {
      createElement: [],
      appendChild: [],
      removeChild: [],
    };
    return this;
  }

  // Utility methods

  /**
   * Verify a download operation occurred
   */
  verifyDownload(
    expectedFilename?: string,
    expectedHref?: string
  ): {
    success: boolean;
    anchor?: MockHTMLElement;
    error?: string;
  } {
    const anchors = this.getAnchors();

    if (anchors.length === 0) {
      return {
        success: false,
        error: 'No anchor elements created',
      };
    }

    const lastAnchor = anchors[anchors.length - 1];

    if (expectedFilename && lastAnchor.download !== expectedFilename) {
      return {
        success: false,
        anchor: lastAnchor.element,
        error: `Expected download="${expectedFilename}", got "${lastAnchor.download}"`,
      };
    }

    if (expectedHref && lastAnchor.href !== expectedHref) {
      return {
        success: false,
        anchor: lastAnchor.element,
        error: `Expected href="${expectedHref}", got "${lastAnchor.href}"`,
      };
    }

    // Check if element was appended and removed
    const wasAppended = this.wasAppended(lastAnchor.element as unknown as HTMLElement);
    const wasRemoved = this.wasRemoved(lastAnchor.element as unknown as HTMLElement);

    if (!wasAppended) {
      return {
        success: false,
        anchor: lastAnchor.element,
        error: 'Anchor was not appended to body',
      };
    }

    if (!wasRemoved) {
      return {
        success: false,
        anchor: lastAnchor.element,
        error: 'Anchor was not removed from body',
      };
    }

    return {
      success: true,
      anchor: lastAnchor.element,
    };
  }

  /**
   * Print current state (for debugging)
   */
  debugPrint(): void {
    console.log('=== MockDOMHelpers State ===');
    console.log('Created elements:', this.calls.createElement);
    console.log('Currently appended:', this.appendedElements.length);
    console.log('Anchors:', this.getAnchors());
  }
}
