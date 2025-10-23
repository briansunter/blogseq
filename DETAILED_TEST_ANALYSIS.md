# Detailed Test-by-Test Analysis

## Reference Resolution Tests (11/27 failing)

### PASSING (16 tests)
- Page references with matching pages ✓
- Multiple page references in same content ✓
- Case-insensitive UUID matching ✓
- Plain UUID patterns validation ✓
- Fallback to null handling ✓

### FAILING (11 tests)

#### 1. Block reference resolution (((uuid)))
**Test:** should resolve ((uuid)) block reference to block content

```
Expected: 'Reference to Referenced block content'
Actual:   'Reference to ((block-ref-uuid))'
```

**Root Cause:** `mockAPI.Editor.getBlock()` not configured with refBlock data

**Fix Required:**
```typescript
// Current: only mocks getCurrentPage
mockCurrentPageResponse(mockAPI, page);

// Need: also mock block
const refBlock = createMockBlock({
  uuid: 'block-ref-uuid',
  content: 'Referenced block content'
});
mockAPI.Editor.getBlock.mockResolvedValue(refBlock);
// OR (with new mocks):
mockAPI.addBlock(refBlock);
```

---

#### 2. Asset UUID caching
**Test:** should cache resolved asset UUID

```
Expected: queryCallCount > 0
Actual:   queryCallCount = 0
```

**Root Cause:** DataScript query tracking not working

**Issue:** 
- Test expects DataScript to be called and tracked
- Mock doesn't track/cache asset queries
- MockLogseqAPI has built-in query patterns but tests not using them

**Fix Required:**
- Use MockLogseqAPI.addQueryPattern() for asset detection
- OR configure asset in mock state: `mockAPI.addAsset(uuid, 'png', entity)`
- Test should then verify asset was detected

---

#### 3. Error during getPage
**Test:** should handle error during getPage gracefully

```
Error: API Error (unhandled exception)
Expected: result contains '[Unresolved:...'
```

**Root Cause:** Exception thrown instead of caught

**Issue:**
- Test mocks error: `mockRejectedValue(new Error('API Error'))`
- Implementation doesn't catch error
- Exception propagates instead of graceful fallback

**Fix Required:**
1. Update test: Error should be caught somewhere
2. OR Update implementation: Add try/catch with fallback
3. Current behavior is wrong - should not throw

**Code Change Needed in markdownExporter.ts:**
```typescript
async resolveUuid(uuid: string) {
  try {
    // Try asset detection
    // Try page lookup
    // Try block lookup
  } catch (error) {
    // Return unresolved format: [Unresolved: uuid]
  }
}
```

---

#### 4. Mixed reference types
**Test:** should handle mixed reference types in same content

```
Expected: Both 'Page Page Ref' and 'block Block Ref' and 'plain Plain Ref'
Actual:   All remain as UUIDs
```

**Root Cause:** Multiple reference types not resolved together

**Issue:**
- Test has: page ref, block ref, plain UUID all in one string
- Mock only configured for page ref
- Other reference types fail silently
- Sequential resolution doesn't work

**Fix Required:**
```typescript
// Setup all reference types in mock
mockAPI.addPage(pageRef);
mockAPI.addBlock(blockRef);
mockAPI.addPage(plainRef);  // or appropriate type

// Each resolveReferences call should check all types
```

---

#### 5-11. Remaining reference tests (caching, fallback, etc.)

**Pattern:** All share same issue - mock not fully wired with reference data

**Solution:** Migrate test to use MockLogseqAPI with builders:
```typescript
const mockAPI = new MockLogseqAPI();

// Setup all references upfront
const pageRef = new PageBuilder().withUuid(...).withName('Page').build();
const blockRef = new BlockBuilder().withUuid(...).withContent('Block').build();

mockAPI.setCurrentPage(page);
mockAPI.addPage(pageRef);
mockAPI.addBlock(blockRef);

// Now reference resolution works automatically
```

---

## Asset Detection Tests (22/28 failing)

### PASSING (6 tests)
- Empty DataScript results ✓
- DataScript query errors ✓
- Non-asset pages ✓
- Invalid UUID formats ✓
- Assets with no extension ✓
- Asset path without trailing slash ✓

### FAILING (22 tests)

#### Group 1: DataScript Detection (8 tests failing)

**Test:** should detect asset via DataScript query with type

```
Expected: assets.has(assetUuid) === true
Actual:   assets.has(assetUuid) === false
```

**Root Cause:** Asset not added to exporter's referencedAssets map

**Issue Analysis:**
1. DataScript mock returns data: `[['png', { ':block/uuid': ... }]]`
2. But `detectAsset()` doesn't parse this structure
3. Or asset is detected but not tracked in `referencedAssets` map

**Code in Test:**
```typescript
mockAPI.DB.datascriptQuery.mockImplementation(async (query: string) => {
  if (query.includes(assetUuid) && query.includes(':logseq.property.asset/type')) {
    return [['png', { ':block/uuid': { $uuid: assetUuid }, ':block/title': 'Image' }]];
  }
  return [];
});
```

**Problem:** Return format doesn't match implementation expectations

**Fix:**
1. Check what format `detectAsset()` expects
2. Configure MockLogseqAPI asset patterns to match
3. Call `mockAPI.addAsset()` to register asset:
```typescript
mockAPI.addAsset(assetUuid, 'png', assetEntity);
```

---

#### Group 2: Asset Link Generation (7 tests failing)

**Test:** should create image markdown link with ! prefix

```
Expected: '![My Image](assets/image-uuid.png)'
Actual:   'image-uuid'  (just the UUID)
```

**Root Cause:** `createAssetLink()` not implemented

**Issue:** Implementation returns UUID instead of formatted markdown

**Fix Required:** Implement markdown generation:
```typescript
createAssetLink(asset: AssetInfo): string {
  const isImage = this.isImageType(asset.type);
  const prefix = isImage ? '!' : '';
  const title = asset.title || asset.uuid;
  const path = `${this.options.assetPath}${asset.uuid}`;
  return `${prefix}[${title}](${path})`;
}
```

---

#### Group 3: Asset Title Resolution (3 tests failing)

**Test:** should use title from :block/title property

```
Expected: 'Title from :block/title' in output
Actual:   UUID instead
```

**Root Cause:** Block title property not extracted

**Issue:** Asset entity may have properties but not being read

**Fix:** Extract title from various properties:
```typescript
getAssetTitle(entity: LogseqEntity): string {
  // Try different property paths
  return entity[':block/title'] || 
         entity['block/title'] ||
         entity.title ||
         entity.name ||
         entity.uuid;
}
```

---

#### Group 4: Custom Asset Path (2 tests failing)

**Test:** should respect custom assetPath

```
Expected: 'images/custom-path-...'
Actual:   'assets/custom-path-...'
```

**Root Cause:** Custom assetPath option not applied

**Issue:** Either not passed to createAssetLink or not used in formatting

**Fix:** Apply assetPath consistently:
```typescript
// In createAssetLink
const assetPath = this.options.assetPath || 'assets/';
const path = `${assetPath}${filename}`;
```

---

#### Group 5: Asset Tracking (2 tests failing)

**Test:** should track asset in referencedAssets map

```
Expected: exporter.getReferencedAssets().size > 0
Actual:   size === 0
```

**Root Cause:** Asset tracking not called or broken

**Issue:** 
- Asset detected via DataScript
- But not added to `referencedAssets` map
- OR map not exposed via `getReferencedAssets()`

**Fix:**
1. Ensure detectAsset() calls trackAsset()
2. Ensure trackAsset() adds to map:
```typescript
trackAsset(uuid: string, asset: AssetInfo): void {
  this.referencedAssets.set(uuid, asset);
}
```
3. Ensure getReferencedAssets() returns map properly

---

## Block Processing Tests (4/30 failing)

### PASSING (26 tests)
- Basic text blocks ✓
- Empty blocks ✓
- All heading levels ✓
- Nested blocks with flattening ✓
- Property-only blocks ✓
- Asset blocks ✓
- Special characters ✓
- Whitespace handling ✓

### FAILING (4 tests)

#### 1. Null block handling
**Test:** should handle null block gracefully

```
Error: Cannot read properties of null (reading 'uuid')
Stack: processBlock() -> block.uuid
```

**Root Cause:** No null check before accessing block properties

**Fix:** Add guard:
```typescript
processBlock(block: BlockEntity | null, ...): string {
  if (!block) return '';
  
  if (!block.uuid) return '';
  
  // rest of logic
}
```

---

#### 2-3. Nested block indentation (2 tests failing)

**Test:** should create indented list when flattenNested=false

```
Expected: '- Child 1\n- Child 2' (list items)
Actual:   'Child 1\n\nChild 2' (paragraphs)
```

**Root Cause:** Indentation logic not implemented

**Issue:**
- When `flattenNested=false`, children should become list items
- Not simple paragraph processing
- Need indentation tracking

**Fix:** Implement nested list generation:
```typescript
if (!this.options.flattenNested && block.children?.length) {
  // Generate indented list
  const childItems = block.children
    .map((child, level) => {
      const indent = '  '.repeat(level);
      return `${indent}- ${child.content}`;
    });
  return `${block.content}\n\n${childItems.join('\n')}`;
}
```

---

#### 4. Preserve block refs option

**Test:** should respect preserveBlockRefs option

```
Expected: 'Referenced content'
Actual:   '((ref-uuid))'
```

**Root Cause:** Reference resolution not checking option

**Issue:**
- Test sets `preserveBlockRefs: true`
- But reference still shows as UUID
- Option not being respected

**Fix:** Check option before resolving:
```typescript
if (this.options.preserveBlockRefs) {
  // Resolve the reference
  const resolved = await this.resolveUuid(uuid);
  if (resolved) return resolved;
}
```

---

## Frontmatter Generation Tests (6/31 failing)

### PASSING (25 tests)
- Basic frontmatter ✓
- Slug generation ✓
- Property mapping ✓
- Tag merging ✓
- Tag deduplication ✓
- String values ✓
- Array values ✓
- YAML formatting ✓
- Multi-line strings ✓
- Numeric values ✓

### FAILING (6 tests)

#### 1. Empty frontmatter
**Test:** should return empty string when page has no properties

```
Expected: ''
Actual:   '_No content found on this page._'
```

**Root Cause:** Fallback message added when shouldn't be

**Issue:** Frontmatter generation adds fallback when no content

**Fix:** Only add message for main content, not frontmatter:
```typescript
generateFrontmatter(page: PageEntity): string {
  if (!page.properties || Object.keys(page.properties).length === 0) {
    return '';  // Just empty, no message
  }
  // generate frontmatter
}
```

---

#### 2. Empty tags array
**Test:** should handle empty tags array

```
Expected: No 'tags:' line
Actual:   'tags:\n'
```

**Root Cause:** Empty arrays not filtered

**Fix:** Filter empty values:
```typescript
processPropertyValue(value: unknown): unknown {
  if (Array.isArray(value) && value.length === 0) {
    return null;  // Skip empty arrays
  }
  // ...
}
```

---

#### 3. UUID resolution in properties
**Test:** should resolve UUID string to asset path

```
Expected: 'image: assets/image-uuid-...'
Actual:   'image: ...' (malformed)
```

**Root Cause:** Asset path generation broken for property values

**Fix:** Apply asset path correctly:
```typescript
if (this.isImageAsset(value)) {
  const filename = extractFilename(value);
  return `${this.options.assetPath}${filename}`;
}
```

---

#### 4. Boolean values
**Test:** should handle boolean values

```
Expected: 'draft: false'
Actual:   (boolean not in output)
```

**Root Cause:** Boolean serialization missing

**Fix:** Handle booleans in YAML:
```typescript
if (typeof value === 'boolean') {
  return value.toString();  // 'true' or 'false'
}
```

---

#### 5. Custom asset path in properties
**Test:** should handle custom assetPath in property values

```
Expected: 'cover: media/cover-uuid-...'
Actual:   'cover: assets/...' (wrong path)
```

**Root Cause:** Custom assetPath option not applied to properties

**Fix:** Use option consistently:
```typescript
const path = `${this.options.assetPath}${uuid}`;
```

---

#### 6. Empty string values
**Test:** should handle empty string property values

```
Expected: 'empty: '  (empty value)
Actual:   Wrong format or missing
```

**Root Cause:** Empty string YAML serialization

**Fix:** Preserve empty strings:
```typescript
if (value === '') {
  return '';  // Keep empty string, don't omit
}
```

---

## Hook Tests Issues

### useAppVisible (1/20 failing)

**Test:** should return a boolean value

```
Expected: typeof === 'boolean'
Actual:   typeof === 'undefined'
```

**Root Cause:** Hook doesn't initialize with boolean state

**Fix:** Initialize hook:
```typescript
const [isVisible, setIsVisible] = useState<boolean>(true);
```

---

### useBatchExport (1 unhandled error)

**Error:** Cannot read properties of null (reading 'exportPagesToZip')

**Root Cause:** Hook returns null or not initialized

**Fix:** Ensure hook properly instantiated in test:
```typescript
const { result } = renderHook(() => useBatchExport());
// result should be { current: { exportPagesToZip, ... } }
```

---

## Summary Table

| Category | Files | Tests | Failures | Root Cause | Fix Time |
|----------|-------|-------|----------|-----------|----------|
| Reference Resolution | 1 | 27 | 11 | Mock setup | 1 hour |
| Asset Detection | 1 | 28 | 22 | Logic + mocks | 3 hours |
| Block Processing | 1 | 30 | 4 | Null check + indent | 1 hour |
| Frontmatter | 1 | 31 | 6 | Edge cases | 1 hour |
| Hooks | 2 | 40 | 3 | Init + types | 30 min |
| **TOTAL** | **6** | **156** | **46** | **Various** | **6.5 hrs** |

---

## Implementation Order

1. **Start:** Fix MockLogseqAPI consolidation (test-utils.ts)
2. **Quick wins:** Null checks in processBlock()
3. **Medium work:** Asset detection and linking
4. **Longer work:** Reference resolution with proper mocks
5. **Polish:** Frontmatter edge cases and hook initialization

---

## Verification Per Fix

```bash
# After mock consolidation
npm test -- referenceResolution

# After null checks
npm test -- blockProcessing

# After asset link implementation  
npm test -- assetDetection

# After frontmatter fixes
npm test -- frontmatterGeneration

# After hook fixes
npm test -- hooks

# Full validation
npm test
```

