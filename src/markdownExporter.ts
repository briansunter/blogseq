import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// Core types
export type ExportOptions = {
  includeTags?: boolean;
  includeProperties?: boolean;
  preserveBlockRefs?: boolean;
  flattenNested?: boolean;
  removeLogseqSyntax?: boolean;
  resolvePlainUuids?: boolean;
  includePageName?: boolean;
  assetPath?: string;
  debug?: boolean;
}

export const DEFAULT_OPTIONS: Required<ExportOptions> = {
  includeTags: false,
  includeProperties: false,
  preserveBlockRefs: true,
  flattenNested: true,
  removeLogseqSyntax: true,
  resolvePlainUuids: true,
  includePageName: true,
  assetPath: 'assets/',
  debug: false,
};

export type AssetInfo = {
  uuid: string;
  title: string;
  type: string;
  originalPath: string;
  exportPath: string;
}

export type LogseqEntity = Record<string, unknown> & {
  uuid?: string | { $uuid: string };
  title?: string | unknown[];
  name?: string;
  properties?: Record<string, unknown>;
}

// API types
export type LogseqAPI = {
  getCurrentPage: () => Promise<BlockEntity | PageEntity | null>;
  getPage: (uuid: string) => Promise<BlockEntity | PageEntity | null>;
  getBlock: (uuid: string, opts?: { includeChildren?: boolean }) => Promise<BlockEntity | null>;
  getPageBlocksTree: (pageUuid: string) => Promise<BlockEntity[]>;
  getCurrentGraph: () => Promise<{ path: string } | null>;
  datascriptQuery: (query: string) => Promise<unknown[][]>;
  showMsg: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export type FileAPI = {
  fetch: (url: string) => Promise<Response>;
  saveAs: (blob: Blob, filename: string) => void;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  writeToClipboard: (text: string) => Promise<void>;
}

export type DOMHelpers = {
  createElement: (tagName: string) => HTMLElement;
  appendChild: (element: HTMLElement) => void;
  removeChild: (element: HTMLElement) => void;
}

// Helper utilities
export class MarkdownHelpers {
  private static readonly UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  private static readonly PROPERTY_REGEX = /^[a-zA-Z][a-zA-Z0-9-_]*::\s*.+$/;
  private static readonly IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp']);

  static extractUuid(value?: string | { $uuid: string }): string | undefined {
    if (!value) return undefined;
    return typeof value === 'string' ? value : value.$uuid;
  }

  static isUuid(str: string): boolean {
    return this.UUID_REGEX.test(str);
  }

  static isPropertyOnlyBlock(content: string): boolean {
    if (!content) return false;
    return content.split('\n').every(line => 
      !line.trim() || this.PROPERTY_REGEX.test(line.trim())
    );
  }

  static cleanLogseqSyntax(content: string, options: ExportOptions): string {
    let result = content
      .replace(/^[a-zA-Z-_]+::\s*.+$/gm, "")
      .replace(/\{\{(query|renderer|embed)[^}]*\}\}/g, "")
      .replace(/^(TODO|DOING|NOW|LATER|DONE|WAITING|CANCELLED)\s+/gm, "")
      .replace(/\b(NOW)\s+/g, "")
      .replace(/\[#[A-Z]\]\s*/g, "")
      .replace(/\[\[+([^\]]+)\]\]+/g, "$1");
    
    if (!options.includeTags) {
      result = result.replace(/#[^\s#[\]{}(),.!?;:'"]+/g, "");
    }
    
    return result.replace(/\n{3,}/g, "\n\n").trim();
  }

  static processAssetPaths(content: string, assetPath: string): string {
    const path = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
    return content.replace(
      /(!)?\[([^\]]*)\]\(\.\.\/assets\/([^)]+)\)/g, 
      `$1[$2](${path}$3)`
    );
  }

  static postProcessMarkdown(markdown: string): string {
    return markdown
      .replace(/\n{3,}/g, "\n\n")
      .replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2")
      .replace(/(#{1,6}\s[^\n]+)\n([^\n])/g, "$1\n\n$2")
      .replace(/\n\n-\s/g, "\n- ")
      .replace(/^-\s*$/gm, "")
      .trim();
  }

  static getHeadingLevel(block: BlockEntity): number | null {
    // Check multiple possible property locations
    let level = (block as Record<string, unknown>)['logseq.property/heading'];
    
    // Also check in properties object if it exists
    if (!level && (block as Record<string, unknown>).properties) {
      level = ((block as Record<string, unknown>).properties as Record<string, unknown>)['logseq.property/heading'];
    }
    
    // Also check with colon prefix (DataScript format)
    if (!level) {
      level = (block as Record<string, unknown>)[':logseq.property/heading'];
    }
    
    return typeof level === 'number' && level >= 1 && level <= 6 ? level : null;
  }

  static formatYaml(data: Record<string, unknown>): string {
    const lines = ["---"];
    
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        value.forEach(item => lines.push(`  - ${item}`));
      } else if (typeof value === 'string' && value.includes('\n')) {
        lines.push(`${key}: |`);
        value.split('\n').forEach(line => lines.push(`  ${line}`));
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    
    lines.push("---");
    return lines.join('\n') + '\n';
  }

  // cleanPropertyKey removed - now using DataScript queries directly

  static isSystemProperty(key: string): boolean {
    // System properties are those not in user.property namespace
    const namespace = key.split('/')[0].replace(':', '');
    return namespace !== 'user.property' && namespace !== 'user';
  }

  static isImageAsset(type: string): boolean {
    return this.IMAGE_TYPES.has(type.toLowerCase());
  }
}

// Main exporter class
export class MarkdownExporter {
  private processedBlocks = new Set<string>();
  private blockRefCache = new Map<string, string>();
  private referencedAssets = new Map<string, AssetInfo>();
  private graphPath = "";
  private debugEnabled = false;
  
  constructor(
    private logseqAPI: LogseqAPI = {
      getCurrentPage: () => logseq.Editor.getCurrentPage(),
      getPage: (uuid) => logseq.Editor.getPage(uuid),
      getBlock: (uuid, opts) => logseq.Editor.getBlock(uuid, opts),
      getPageBlocksTree: (uuid) => logseq.Editor.getPageBlocksTree(uuid),
      getCurrentGraph: () => logseq.App.getCurrentGraph(),
      datascriptQuery: (query) => logseq.DB.datascriptQuery(query),
      showMsg: (msg, type) => logseq.UI.showMsg(msg, type)
    },
    private fileAPI: FileAPI = {
      fetch: (url) => fetch(url),
      saveAs: (blob, filename) => saveAs(blob, filename),
      createObjectURL: (blob) => URL.createObjectURL(blob),
      revokeObjectURL: (url) => URL.revokeObjectURL(url),
      writeToClipboard: (text) => navigator.clipboard.writeText(text)
    },
    private domHelpers: DOMHelpers = {
      createElement: (tagName) => document.createElement(tagName),
      appendChild: (element) => document.body.appendChild(element),
      removeChild: (element) => document.body.removeChild(element)
    }
  ) {}
  
  private debug(...args: unknown[]): void {
    if (this.debugEnabled) console.log(...args);
  }
  
  async exportCurrentPage(options: ExportOptions = {}): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.debugEnabled = opts.debug || false;
    
    this.debug('Starting export with options:', opts);
    
    const currentPage = await this.logseqAPI.getCurrentPage();
    if (!currentPage) throw new Error("NO_ACTIVE_PAGE");
    
    const graph = await this.logseqAPI.getCurrentGraph();
    if (graph?.path) this.graphPath = graph.path;
    
    const pageBlocks = await this.logseqAPI.getPageBlocksTree(currentPage.uuid);
    
    // Reset state
    this.processedBlocks.clear();
    this.blockRefCache.clear();
    this.referencedAssets.clear();
    
    // Build markdown
    let markdown = "";
    
    if (opts.includeProperties) {
      const frontmatter = await this.generateFrontmatter(currentPage, opts.assetPath);
      if (frontmatter) markdown = frontmatter + "\n";
    }
    
    if (opts.includePageName) {
      markdown += `# ${currentPage.name}\n\n`;
    }
    
    if (!pageBlocks || pageBlocks.length === 0) {
      return markdown + "_No content found on this page._";
    }
    
    // Pre-cache references
    await this.cacheBlockReferences(pageBlocks);
    
    // Process blocks
    const propertyValues = await this.collectPropertyValues(currentPage.uuid);
    
    for (const block of pageBlocks) {
      const content = block.content?.trim();
      if (content && propertyValues.has(content)) {
        this.debug(`Skipping property value: "${content}"`);
        continue;
      }
      
      markdown += await this.processBlock(block, 0, opts);
    }
    
    return MarkdownHelpers.postProcessMarkdown(markdown);
  }
  
  private async processBlock(block: BlockEntity, depth: number, options: ExportOptions): Promise<string> {
    if (!block) return "";
    
    if (block.uuid && this.processedBlocks.has(block.uuid)) return "";
    if (block.uuid) this.processedBlocks.add(block.uuid);
    
    // Check if this block itself is an asset
    if (block.uuid) {
      const assetInfo = await this.detectAsset(block.uuid);
      if (assetInfo) {
        const assetPath = options.assetPath ?? 'assets/';
        const markdown = this.createAssetLink(block.uuid, assetInfo, assetPath);
        return markdown + '\n\n' + await this.processChildren(block, depth, options);
      }
    }
    
    let content = block.content || "";
    
    if (MarkdownHelpers.isPropertyOnlyBlock(content)) {
      return this.processChildren(block, depth, options);
    }
    
    // Process content
    if (options.preserveBlockRefs) {
      content = await this.resolveReferences(content, options.assetPath ?? 'assets/');
    }
    
    if (options.removeLogseqSyntax) {
      content = MarkdownHelpers.cleanLogseqSyntax(content, options);
    }
    
    content = await this.trackAssets(content, options.assetPath ?? 'assets/');
    
    // Format as markdown
    const headingLevel = MarkdownHelpers.getHeadingLevel(block);
    
    // Debug logging for heading detection
    if (this.debugEnabled && headingLevel !== null) {
      this.debug(`Block with heading level ${headingLevel}:`, block.content);
    }
    
    if (headingLevel !== null && content && options.flattenNested) {
      const heading = '#'.repeat(headingLevel) + ' ' + content;
      return heading + '\n\n' + await this.processChildren(block, depth, options);
    } else if (options.flattenNested || depth === 0) {
      const markdown = content ? `${content}\n\n` : "";
      return markdown + await this.processChildren(block, depth, options);
    } else {
      const indent = "  ".repeat(depth);
      const markdown = content ? `${indent}- ${content}\n` : "";
      return markdown + await this.processChildren(block, depth + 1, options);
    }
  }
  
  private async processChildren(block: BlockEntity, depth: number, options: ExportOptions): Promise<string> {
    if (!block.children?.length) return "";
    
    const results = await Promise.all(
      (block.children as BlockEntity[]).map(child => 
        this.processBlock(child, depth + (options.flattenNested ? 1 : 0), options)
      )
    );
    
    return results.join('');
  }
  
  private async resolveReferences(content: string, assetPath: string): Promise<string> {
    let result = content;
    
    // Handle [[uuid]] page refs
    result = await this.replaceAsync(result, /\[\[([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\]\]/gi,
      async (_, uuid) => {
        const resolved = await this.resolveUuid(String(uuid), assetPath);
        return resolved ?? `[[${uuid}]]`;
      }
    );
    
    // Handle ((uuid)) block refs
    result = await this.replaceAsync(result, /\(\(([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\)\)/gi,
      async (_, uuid) => {
        const uuidStr = String(uuid);
        const resolved = await this.resolveUuid(uuidStr, assetPath);
        return resolved ?? `[Unresolved: ${uuidStr.substring(0, 8)}...]`;
      }
    );
    
    // Handle plain UUIDs
    result = await this.replaceAsync(result, /\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/gi,
      async (match, uuid, offset) => {
        const matchStr = String(match);
        const uuidStr = String(uuid);
        const offsetNum = Number(offset);
        const preceding = result[offsetNum - 1];
        if (['/', '-', '_'].includes(preceding)) return matchStr;
        
        const resolved = await this.resolveUuid(uuidStr, assetPath);
        return resolved ?? matchStr;
      }
    );
    
    return result;
  }
  
  private async resolveUuid(uuid: string, assetPath: string): Promise<string | null> {
    // Check cache
    const cached = this.blockRefCache.get(uuid);
    if (cached?.startsWith('![') || cached?.includes(`](${assetPath}`)) {
      return cached;
    }
    
    // Check if it's an asset
    const assetInfo = await this.detectAsset(uuid);
    if (assetInfo) {
      return this.createAssetLink(uuid, assetInfo, assetPath);
    }
    
    // Try as page
    try {
      const page = await this.logseqAPI.getPage(uuid);
      if (page && 'name' in page && page.name) {
        const name = String(page.name);
        this.blockRefCache.set(uuid, name);
        return name;
      }
    } catch {
      // Intentionally swallow error - page lookup is optional fallback
    }
    
    // Try as block
    try {
      const block = await this.logseqAPI.getBlock(uuid, { includeChildren: false });
      if (block?.content) {
        let content = await this.resolveReferences(block.content, assetPath);
        content = MarkdownHelpers.cleanLogseqSyntax(content, { 
          includeTags: false, includeProperties: false, removeLogseqSyntax: true 
        });
        this.blockRefCache.set(uuid, content);
        return content;
      }
    } catch {
      // Intentionally swallow error - block lookup is optional fallback
    }
    
    return null;
  }
  
  private async detectAsset(uuid: string): Promise<{ type: string; entity?: LogseqEntity } | null> {
    // Try DataScript query
    try {
      const query = `[:find ?type (pull ?e [*])
                      :where 
                      [?e :block/uuid #uuid "${uuid}"]
                      [?e :logseq.property.asset/type ?type]]`;
      const result = await this.logseqAPI.datascriptQuery(query);
      
      if (result?.[0]) {
        const [type, entity] = result[0];
        if (typeof type === 'string') {
          return { type, entity: entity as LogseqEntity };
        }
      }
    } catch {
      // Intentionally swallow error - DataScript query may fail on invalid UUID
    }
    
    // Check page properties
    try {
      const page = await this.logseqAPI.getPage(uuid);
      if (page) {
        const type = await this.findAssetType(page as LogseqEntity);
        if (type) return { type, entity: page };
      }
    } catch {
      // Intentionally swallow error - page property access is optional
    }
    
    return null;
  }
  
  private async findAssetType(entity: LogseqEntity): Promise<string | null> {
    // Use DataScript query to find asset type property
    const uuid = MarkdownHelpers.extractUuid(entity.uuid);
    if (!uuid) return null;
    
    try {
      const query = `[:find ?type
                      :where 
                      [?e :block/uuid #uuid "${uuid}"]
                      [?e ?prop ?type]
                      [(namespace ?prop) ?ns]
                      [(= ?ns "logseq.property.asset")]
                      [(name ?prop) "type"]]`;
      const result = await this.logseqAPI.datascriptQuery(query);
      
      if (result?.[0]?.[0] && typeof result[0][0] === 'string') {
        return result[0][0];
      }
    } catch {
      // Intentionally swallow error - asset type query may fail
    }
    
    return null;
  }
  
  private createAssetLink(uuid: string, info: { type: string; entity?: LogseqEntity }, assetPath: string): string {
    // Try different property locations for title
    const title = info.entity?.title ||
                  info.entity?.['block/title'] ||
                  info.entity?.[':block/title'] ||
                  info.entity?.name ||
                  `asset-${uuid.substring(0, 8)}`;

    const titleStr = typeof title === 'string' ? title : String(title);
    const path = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
    const exportPath = `${path}${uuid}.${info.type}`;

    // Track asset
    this.referencedAssets.set(uuid, {
      uuid,
      title: titleStr,
      type: info.type,
      originalPath: `${this.graphPath}/assets/${uuid}.${info.type}`,
      exportPath
    });

    // Create markdown link
    const isImage = MarkdownHelpers.isImageAsset(info.type);
    const markdown = `${isImage ? '!' : ''}[${titleStr}](${exportPath})`;
    this.blockRefCache.set(uuid, markdown);

    return markdown;
  }
  
  private async trackAssets(content: string, assetPath: string): Promise<string> {
    const path = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
    
    return content.replace(
      /(!)?\[([^\]]*)\]\(\.\.\/assets\/([^)]+)\)/g, 
      (_, isImg, title, file) => {
        const match = file.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.(\w+)/i);
        if (match) {
          const [, uuid, ext] = match;
          if (!this.referencedAssets.has(uuid)) {
            this.referencedAssets.set(uuid, {
              uuid,
              type: ext,
              title: title || `asset-${uuid.substring(0, 8)}`,
              originalPath: `${this.graphPath}/assets/${uuid}.${ext}`,
              exportPath: `${path}${uuid}.${ext}`
            });
          }
        }
        return `${isImg || ''}[${title}](${path}${file})`;
      }
    );
  }
  
  private async cacheBlockReferences(blocks: BlockEntity[], visited = new Set<string>()): Promise<void> {
    const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
    
    for (const block of blocks) {
      if (block.uuid && !visited.has(block.uuid)) {
        visited.add(block.uuid);
        this.blockRefCache.set(block.uuid, block.content || "");
        
        const uuids = Array.from((block.content || "").matchAll(uuidPattern))
          .map(m => m[0])
          .filter(uuid => !this.blockRefCache.has(uuid));
        
        for (const uuid of uuids) {
          await this.preCacheUuid(uuid);
        }
        
        // Only process children if we haven't visited this block before
        if (block.children?.length) {
          await this.cacheBlockReferences(block.children as BlockEntity[], visited);
        }
      }
    }
  }
  
  private async preCacheUuid(uuid: string): Promise<void> {
    try {
      const page = await this.logseqAPI.getPage(uuid);
      if (page && 'name' in page && page.name) {
        this.blockRefCache.set(uuid, String(page.name));
        return;
      }
    } catch {
      // Intentionally swallow error - page pre-caching is optional
    }
    
    try {
      const block = await this.logseqAPI.getBlock(uuid, { includeChildren: false });
      if (block?.content) {
        this.blockRefCache.set(uuid, block.content);
      }
    } catch {
      // Intentionally swallow error - block pre-caching is optional
    }
  }
  
  private async generateFrontmatter(page: BlockEntity | PageEntity, assetPath = 'assets/'): Promise<string> {
    try {
      // Get the full page entity with all properties
      let pageEntity = page;
      try {
        pageEntity = await this.logseqAPI.getPage(page.uuid) || page;
      } catch {
        // Use original page if getPage fails
      }
      
      // Query for ALL property definitions in the system
      const propertyQuery = `
        [:find ?ident ?title
         :where
         [?e :db/ident ?ident]
         [?e :block/title ?title]]
      `;
      
      const propertyMap = new Map<string, string>();
      
      try {
        const propResults = await this.logseqAPI.datascriptQuery(propertyQuery);
        if (propResults) {
          for (const [ident, title] of propResults) {
            if (typeof ident === 'string' && typeof title === 'string') {
              // Store mapping from full ident to clean title
              propertyMap.set(ident, title);
              propertyMap.set(`:${ident}`, title);
            }
          }
        }
        this.debug('Property definitions from DB:', propertyMap);
      } catch (err) {
        this.debug('Could not query property definitions:', err);
      }
      
      // Also query for the page's actual properties with their clean names
      const pagePropsQuery = `
        [:find ?prop-key ?prop-title
         :where
         [?page :block/uuid #uuid "${page.uuid}"]
         [?page ?prop-key ?v]
         [(namespace ?prop-key) ?ns]
         [(= ?ns "user.property")]
         [?prop-entity :db/ident ?prop-key]
         [?prop-entity :block/title ?prop-title]]
      `;
      
      try {
        const pagePropsResults = await this.logseqAPI.datascriptQuery(pagePropsQuery);
        if (pagePropsResults) {
          for (const [propKey, propTitle] of pagePropsResults) {
            if (typeof propKey === 'string' && typeof propTitle === 'string') {
              propertyMap.set(propKey, propTitle);
              propertyMap.set(`:${propKey}`, propTitle);
            }
          }
        }
        this.debug('Page-specific properties from DB:', pagePropsResults);
      } catch (err) {
        this.debug('Could not query page properties:', err);
      }
      
      const frontmatter: Record<string, unknown> = {};
      
      // Set default title and slug from page name
      if ('name' in pageEntity && pageEntity.name) {
        frontmatter.title = String(pageEntity.name);
        frontmatter.slug = String(pageEntity.name)
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }
      
      const props = (pageEntity as PageEntity).properties;
      if (props) {
        // Process tags first
        const tags: string[] = [];
        
        for (const [key, value] of Object.entries(props)) {
          if (!value) continue;
          
          // Get clean name from property map
          const cleanKey = propertyMap.get(key) || propertyMap.get(`:${key}`);
          if (!cleanKey) {
            this.debug(`Skipping unmapped property: ${key}`);
            continue;
          }
          
          if ((cleanKey === 'tags' || cleanKey === 'blogTags') && Array.isArray(value)) {
            tags.push(...value);
          }
        }
        
        if (tags.length > 0) {
          frontmatter.tags = [...new Set(tags)];
        }
        
        // Process other properties
        for (const [key, value] of Object.entries(props)) {
          if (!value || MarkdownHelpers.isSystemProperty(key)) continue;
          
          // Get clean name from property map
          const cleanKey = propertyMap.get(key) || propertyMap.get(`:${key}`);
          if (!cleanKey) {
            this.debug(`Skipping unmapped property: ${key}`);
            continue;
          }
          
          // Skip tags-related properties we already processed
          if (cleanKey === 'blogTags' || (cleanKey === 'tags' && frontmatter.tags)) {
            continue;
          }
          
          // Process and add the property
          if (!frontmatter[cleanKey] || cleanKey === 'title') {
            this.debug(`Processing property ${key} -> ${cleanKey}`);
            const processedValue = await this.processPropertyValue(value, assetPath);
            frontmatter[cleanKey] = processedValue;
          }
        }
      }
      
      return Object.keys(frontmatter).length > 0 
        ? MarkdownHelpers.formatYaml(frontmatter)
        : "";
    } catch (error) {
      console.error("Error generating frontmatter:", error);
      return "";
    }
  }
  
  private async processPropertyValue(value: unknown, assetPath: string): Promise<unknown> {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Handle [[Page]] refs
      if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
        return trimmed.slice(2, -2);
      }
      
      // Handle UUIDs
      if (MarkdownHelpers.isUuid(trimmed)) {
        const assetInfo = await this.detectAsset(trimmed);
        if (assetInfo) {
          const path = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
          const exportPath = `${path}${trimmed}.${assetInfo.type}`;
          
          // Track asset
          this.referencedAssets.set(trimmed, {
            uuid: trimmed,
            title: typeof assetInfo.entity?.title === 'string' ? assetInfo.entity.title : trimmed,
            type: assetInfo.type,
            originalPath: `${this.graphPath}/assets/${trimmed}.${assetInfo.type}`,
            exportPath
          });
          
          return exportPath;
        }
      }
      
      // Check if it's an asset by title
      const assetByTitle = await this.findAssetByTitle(trimmed);
      if (assetByTitle) {
        const path = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
        return `${path}${assetByTitle.uuid}.${assetByTitle.type}`;
      }
      
      return value;
    }
    
    if (Array.isArray(value) || value instanceof Set) {
      return Array.isArray(value) ? value : Array.from(value);
    }
    
    // Handle db/id references
    if (value && typeof value === 'object' && 'db/id' in value) {
      const resolved = await this.resolveDbReference(value['db/id'] as number, assetPath);
      return resolved ?? value;
    }
    
    return value;
  }
  
  private async findAssetByTitle(title: string): Promise<{ uuid: string; type: string } | null> {
    try {
      const query = `[:find ?uuid ?type
                      :where 
                      [?e :block/title "${title}"]
                      [?e :block/uuid ?uuid]
                      [?e :logseq.property.asset/type ?type]]`;
      const result = await this.logseqAPI.datascriptQuery(query);
      
      if (result?.[0]) {
        const uuid = MarkdownHelpers.extractUuid(result[0][0] as string | { $uuid: string });
        const type = result[0][1];
        if (uuid && type) {
          return { uuid: String(uuid), type: String(type) };
        }
      }
    } catch {
      // Intentionally swallow error - asset title lookup is optional
    }
    
    return null;
  }
  
  private async resolveDbReference(dbId: number, assetPath: string): Promise<string | null> {
    try {
      const query = `[:find ?uuid ?type ?title
                      :where 
                      [?e :db/id ${dbId}]
                      [?e :block/uuid ?uuid]
                      [?e :logseq.property.asset/type ?type]
                      [?e :block/title ?title]]`;
      const result = await this.logseqAPI.datascriptQuery(query);
      
      if (result?.[0]) {
        const uuid = MarkdownHelpers.extractUuid(result[0][0] as string | { $uuid: string });
        const type = result[0][1];
        const title = result[0][2];
        
        if (uuid && type) {
          const path = assetPath.endsWith('/') ? assetPath : `${assetPath}/`;
          const exportPath = `${path}${uuid}.${type}`;
          
          // Track asset
          this.referencedAssets.set(String(uuid), {
            uuid: String(uuid),
            title: String(title || uuid),
            type: String(type),
            originalPath: `${this.graphPath}/assets/${uuid}.${type}`,
            exportPath
          });
          
          return exportPath;
        }
      }
      
      // Try to get title
      const titleQuery = `[:find ?title :where [?e :db/id ${dbId}] [?e :block/title ?title]]`;
      const titleResult = await this.logseqAPI.datascriptQuery(titleQuery);
      return titleResult?.[0]?.[0] as string | null;
    } catch {
      // Intentionally swallow error - DB reference resolution is optional
    }
    
    return null;
  }
  
  private async collectPropertyValues(pageUuid: string): Promise<Set<string>> {
    const values = new Set<string>();
    const page = await this.logseqAPI.getPage(pageUuid);
    const props = (page as LogseqEntity)?.properties;
    
    if (props && typeof props === 'object') {
      for (const val of Object.values(props)) {
        if (typeof val === 'string') {
          values.add(val.trim());
        } else if (Array.isArray(val)) {
          val.forEach(v => typeof v === 'string' && values.add(v.trim()));
        } else if (val instanceof Set) {
          val.forEach(v => typeof v === 'string' && values.add(v.trim()));
        }
      }
    }
    
    return values;
  }
  
  private async replaceAsync(
    str: string, 
    regex: RegExp, 
    asyncFn: (match: string, ...args: (string | number | undefined)[]) => Promise<string>
  ): Promise<string> {
    const promises: Promise<string>[] = [];
    const matches: RegExpExecArray[] = [];
    let match;
    
    while ((match = regex.exec(str)) !== null) {
      matches.push(match);
      promises.push(asyncFn(match[0], ...match.slice(1), match.index));
    }
    
    const replacements = await Promise.all(promises);
    let result = str;
    
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      result = result.slice(0, m.index) + replacements[i] + result.slice(m.index + m[0].length);
    }
    
    return result;
  }
  
  // File operations
  async downloadMarkdown(content: string, filename?: string): Promise<void> {
    const currentPage = await this.logseqAPI.getCurrentPage();
    const pageName = currentPage?.name || "export";
    const safeFileName = filename || `${String(pageName).replace(/[^a-z0-9]/gi, "-")}.md`;
    
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = this.fileAPI.createObjectURL(blob);
    
    const link = this.domHelpers.createElement("a") as HTMLAnchorElement;
    link.href = url;
    link.download = safeFileName;
    link.style.display = "none";
    
    this.domHelpers.appendChild(link);
    link.click();
    
    setTimeout(() => {
      this.domHelpers.removeChild(link);
      this.fileAPI.revokeObjectURL(url);
    }, 100);
  }
  
  async copyToClipboard(content: string): Promise<void> {
    try {
      await this.fileAPI.writeToClipboard(content);
      this.logseqAPI.showMsg("Markdown copied to clipboard!", "success");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      this.logseqAPI.showMsg("Failed to copy to clipboard", "error");
    }
  }
  
  async downloadAsZip(content: string, filename?: string, assetPath = 'assets/'): Promise<void> {
    const currentPage = await this.logseqAPI.getCurrentPage();
    const pageName = currentPage?.name || "export";
    const safeFileName = filename || `${String(pageName).replace(/[^a-z0-9]/gi, "-")}`;

    const zip = new JSZip();
    zip.file(`${safeFileName}.md`, content);

    let successCount = 0;
    const failedAssets: string[] = [];

    console.log(`Starting ZIP export with ${this.referencedAssets.size} assets`);

    if (this.referencedAssets.size > 0) {
      // Clean up the asset path - remove ../ and any leading/trailing slashes
      let folderName = assetPath.replace(/\.\.\//g, '').replace(/^\/+|\/+$/g, '');
      // Default to 'assets' if empty
      folderName = folderName || 'assets';
      console.log(`Creating folder: ${folderName}`);

      const assetsFolder = zip.folder(folderName);

      for (const [uuid, assetInfo] of this.referencedAssets) {
        try {
          const assetUrl = `file://${assetInfo.originalPath}`;
          console.log(`Fetching asset: ${assetInfo.title} from ${assetUrl}`);
          const response = await this.fileAPI.fetch(assetUrl);

          if (response.ok) {
            const assetBlob = await response.blob();
            // Add file to assets folder
            const assetFileName = `${uuid}.${assetInfo.type}`;
            assetsFolder?.file(assetFileName, assetBlob);
            successCount++;
            console.log(`✅ Added asset to ZIP: ${assetInfo.title} as ${folderName}/${assetFileName}`);
            this.debug(`✅ Added asset: ${assetInfo.title}`);
          } else {
            throw new Error(`Failed to fetch: ${response.status}`);
          }
        } catch (error) {
          console.error(`Failed to add asset ${assetInfo.title}:`, error);
          failedAssets.push(assetInfo.title);
        }
      }
    }
    
    const blob = await zip.generateAsync({ type: "blob" });
    this.fileAPI.saveAs(blob, `${safeFileName}.zip`);
    
    // Show status
    if (this.referencedAssets.size > 0) {
      if (failedAssets.length === 0) {
        this.logseqAPI.showMsg(`Exported as ZIP with ${successCount} assets!`, "success");
      } else if (successCount > 0) {
        this.logseqAPI.showMsg(
          `Exported as ZIP with ${successCount} assets! (${failedAssets.length} failed)`, 
          "warning"
        );
      } else {
        this.logseqAPI.showMsg(`Exported as ZIP! (Failed to include assets)`, "warning");
      }
    } else {
      this.logseqAPI.showMsg(`Exported as ZIP!`, "success");
    }
  }
  
  // Query support
  async exportWithCustomQuery(query: string): Promise<string> {
    try {
      const results = await this.logseqAPI.datascriptQuery(query);
      
      let markdown = "# Query Results\n\n";
      
      if (results?.length > 0) {
        for (const result of results) {
          if (typeof result === "object" && result !== null) {
            if ("block/content" in result) {
              const content = MarkdownHelpers.cleanLogseqSyntax(
                (result as Record<string, unknown>)["block/content"] as string, 
                DEFAULT_OPTIONS
              );
              markdown += content + "\n\n";
            } else {
              markdown += JSON.stringify(result, null, 2) + "\n\n";
            }
          }
        }
      } else {
        markdown += "_No results found for the query._\n";
      }
      
      return markdown;
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
  }
  
  // Public accessors
  getReferencedAssets(): Map<string, AssetInfo> {
    return this.referencedAssets;
  }
  
  getGraphPath(): string {
    return this.graphPath;
  }
}

export const exporter = new MarkdownExporter();