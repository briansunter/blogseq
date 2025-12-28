import type { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import { describe, expect, it } from "vitest";
import { type ExportOptions, MarkdownHelpers } from "../../../markdownExporter";

describe("MarkdownHelpers", () => {
	describe("extractUuid", () => {
		it("should extract UUID from string", () => {
			const uuid = "12345678-1234-1234-1234-123456789abc";
			expect(MarkdownHelpers.extractUuid(uuid)).toBe(uuid);
		});

		it("should extract UUID from object with $uuid property", () => {
			const uuid = "12345678-1234-1234-1234-123456789abc";
			const obj = { $uuid: uuid };
			expect(MarkdownHelpers.extractUuid(obj)).toBe(uuid);
		});

		it("should return undefined for undefined input", () => {
			expect(MarkdownHelpers.extractUuid(undefined)).toBeUndefined();
		});

		it("should return undefined for null input", () => {
			expect(MarkdownHelpers.extractUuid(null as unknown as undefined)).toBeUndefined();
		});

		it("should return undefined for empty string", () => {
			expect(MarkdownHelpers.extractUuid("")).toBeUndefined();
		});

		it("should handle object with empty $uuid", () => {
			const obj = { $uuid: "" };
			expect(MarkdownHelpers.extractUuid(obj)).toBe("");
		});
	});

	describe("isUuid", () => {
		it("should validate lowercase UUID", () => {
			expect(MarkdownHelpers.isUuid("12345678-1234-1234-1234-123456789abc")).toBe(true);
		});

		it("should validate uppercase UUID", () => {
			expect(MarkdownHelpers.isUuid("12345678-1234-1234-1234-123456789ABC")).toBe(true);
		});

		it("should validate mixed case UUID", () => {
			expect(MarkdownHelpers.isUuid("12345678-1234-1234-1234-123456789AbC")).toBe(true);
		});

		it("should reject UUID that is too short", () => {
			expect(MarkdownHelpers.isUuid("1234-1234-1234-1234")).toBe(false);
		});

		it("should reject UUID that is too long", () => {
			expect(MarkdownHelpers.isUuid("12345678-1234-1234-1234-123456789abcdef")).toBe(false);
		});

		it("should reject UUID with invalid characters", () => {
			expect(MarkdownHelpers.isUuid("12345678-1234-1234-1234-12345678wxyz")).toBe(false);
		});

		it("should reject UUID with missing dashes", () => {
			expect(MarkdownHelpers.isUuid("12345678123412341234123456789abc")).toBe(false);
		});

		it("should reject UUID with wrong dash positions", () => {
			expect(MarkdownHelpers.isUuid("123456781-234-1234-1234-123456789abc")).toBe(false);
		});

		it("should reject empty string", () => {
			expect(MarkdownHelpers.isUuid("")).toBe(false);
		});

		it("should reject non-UUID string", () => {
			expect(MarkdownHelpers.isUuid("not-a-uuid")).toBe(false);
		});

		it("should reject UUID with spaces", () => {
			expect(MarkdownHelpers.isUuid("12345678-1234-1234-1234-123456789abc ")).toBe(false);
		});
	});

	describe("isPropertyOnlyBlock", () => {
		it("should return true for single line property", () => {
			const content = "title:: My Title";
			expect(MarkdownHelpers.isPropertyOnlyBlock(content)).toBe(true);
		});

		it("should return true for multiple properties", () => {
			const content = `title:: My Title
author:: John Doe
tags:: test, example`;
			expect(MarkdownHelpers.isPropertyOnlyBlock(content)).toBe(true);
		});

		it("should return true for properties with whitespace lines", () => {
			const content = `title:: My Title

author:: John Doe`;
			expect(MarkdownHelpers.isPropertyOnlyBlock(content)).toBe(true);
		});

		it("should return false for content with text", () => {
			const content = `title:: My Title
This is some content`;
			expect(MarkdownHelpers.isPropertyOnlyBlock(content)).toBe(false);
		});

		it("should return false for only content", () => {
			const content = "This is just content";
			expect(MarkdownHelpers.isPropertyOnlyBlock(content)).toBe(false);
		});

		it("should return false for empty block", () => {
			expect(MarkdownHelpers.isPropertyOnlyBlock("")).toBe(false);
		});

		it("should return true for whitespace only", () => {
			// Implementation treats whitespace-only content as "property only" since all lines are either empty or properties
			expect(MarkdownHelpers.isPropertyOnlyBlock("   \n  \n  ")).toBe(true);
		});

		it("should handle properties with various formats", () => {
			const content = "my-property:: value";
			expect(MarkdownHelpers.isPropertyOnlyBlock(content)).toBe(true);
		});

		it("should handle properties with underscores", () => {
			const content = "my_property:: value";
			expect(MarkdownHelpers.isPropertyOnlyBlock(content)).toBe(true);
		});

		it("should reject properties with spaces in key", () => {
			const content = "my property:: value";
			expect(MarkdownHelpers.isPropertyOnlyBlock(content)).toBe(false);
		});

		it("should handle properties with numbers", () => {
			const content = "property123:: value";
			expect(MarkdownHelpers.isPropertyOnlyBlock(content)).toBe(true);
		});
	});

	describe("cleanLogseqSyntax", () => {
		const defaultOptions: ExportOptions = {
			includeTags: true,
			includeProperties: false,
			preserveBlockRefs: false,
			flattenNested: false,
			removeLogseqSyntax: true,
		};

		it("should remove properties", () => {
			const content = "title:: My Title\nSome content";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Some content");
		});

		it("should remove multiple properties", () => {
			const content = `title:: My Title
author:: John
Some content`;
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Some content");
		});

		it("should remove query blocks", () => {
			const content = "Content {{query (task TODO)}} more content";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Content  more content");
		});

		it("should remove renderer blocks", () => {
			const content = "Content {{renderer :test}} more content";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Content  more content");
		});

		it("should remove embed blocks", () => {
			const content = "Content {{embed ((uuid))}} more content";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Content  more content");
		});

		it("should remove TODO markers at line start", () => {
			const content = "TODO This is a task";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("This is a task");
		});

		it("should remove DOING markers", () => {
			const content = "DOING Working on this";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Working on this");
		});

		it("should remove DONE markers", () => {
			const content = "DONE Completed task";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Completed task");
		});

		it("should remove WAITING markers", () => {
			const content = "WAITING For approval";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("For approval");
		});

		it("should remove CANCELLED markers", () => {
			const content = "CANCELLED This task";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("This task");
		});

		it("should remove NOW markers at line start", () => {
			const content = "NOW Urgent task";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Urgent task");
		});

		it("should remove LATER markers", () => {
			const content = "LATER Future task";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Future task");
		});

		it("should remove NOW markers mid-sentence", () => {
			const content = "This is NOW important";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("This is important");
		});

		it("should remove priority markers", () => {
			const content = "[#A] High priority task";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("High priority task");
		});

		it("should remove various priority levels", () => {
			expect(MarkdownHelpers.cleanLogseqSyntax("[#B] Task", defaultOptions)).toBe("Task");
			expect(MarkdownHelpers.cleanLogseqSyntax("[#C] Task", defaultOptions)).toBe("Task");
		});

		it("should remove page links", () => {
			const content = "See [[Page Name]] for details";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("See Page Name for details");
		});

		it("should remove nested page links", () => {
			const content = "See [[[Nested Page]]] for details";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("See Nested Page for details");
		});

		it("should keep tags when includeTags is true", () => {
			const content = "Content with #tag";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, {
				...defaultOptions,
				includeTags: true,
			});
			expect(result).toBe("Content with #tag");
		});

		it("should remove tags when includeTags is false", () => {
			const content = "Content with #tag";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, {
				...defaultOptions,
				includeTags: false,
			});
			expect(result).toBe("Content with");
		});

		it("should remove multiple tags when includeTags is false", () => {
			const content = "Content with #tag1 and #tag2";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, {
				...defaultOptions,
				includeTags: false,
			});
			expect(result).toBe("Content with  and");
		});

		it("should reduce multiple newlines to double", () => {
			const content = "Line 1\n\n\n\nLine 2";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("Line 1\n\nLine 2");
		});

		it("should handle complex mixed content", () => {
			const content = `title:: My Page
TODO Task 1
[[Page Link]] with #tag
{{query test}}`;
			const result = MarkdownHelpers.cleanLogseqSyntax(content, {
				...defaultOptions,
				includeTags: false,
			});
			expect(result).toBe("Task 1\nPage Link with");
		});

		it("should trim final output", () => {
			const content = "  content  ";
			const result = MarkdownHelpers.cleanLogseqSyntax(content, defaultOptions);
			expect(result).toBe("content");
		});
		it("should preserve tweet macros", () => {
			const input = "{{tweet https://x.com/karpathy/status/1617979122625712128}}";
			const result = MarkdownHelpers.cleanLogseqSyntax(input, {
				...defaultOptions,
				removeLogseqSyntax: true,
			});
			expect(result).toBe(input);
		});

		it("should preserve video macros", () => {
			const input = "{{video https://youtube.com/shorts/E3SxzRI-s_k?si=gP_sLJtg7igDrh03}}";
			const result = MarkdownHelpers.cleanLogseqSyntax(input, {
				...defaultOptions,
				removeLogseqSyntax: true,
			});
			expect(result).toBe(input);
		});
	});

	describe("processAssetPaths", () => {
		it("should convert asset path with trailing slash", () => {
			const content = "![image](../assets/test.png)";
			const result = MarkdownHelpers.processAssetPaths(content, "custom/path/");
			expect(result).toBe("![image](custom/path/test.png)");
		});

		it("should convert asset path without trailing slash", () => {
			const content = "![image](../assets/test.png)";
			const result = MarkdownHelpers.processAssetPaths(content, "custom/path");
			expect(result).toBe("![image](custom/path/test.png)");
		});

		it("should handle file links (not images)", () => {
			const content = "[file](../assets/document.pdf)";
			const result = MarkdownHelpers.processAssetPaths(content, "assets/");
			expect(result).toBe("[file](assets/document.pdf)");
		});

		it("should handle multiple asset references", () => {
			const content = "![img1](../assets/a.png) and ![img2](../assets/b.jpg)";
			const result = MarkdownHelpers.processAssetPaths(content, "media/");
			expect(result).toBe("![img1](media/a.png) and ![img2](media/b.jpg)");
		});

		it("should handle mixed image and file references", () => {
			const content = "![image](../assets/pic.png) and [doc](../assets/file.pdf)";
			const result = MarkdownHelpers.processAssetPaths(content, "content/");
			expect(result).toBe("![image](content/pic.png) and [doc](content/file.pdf)");
		});

		it("should handle empty alt text", () => {
			const content = "![](../assets/test.png)";
			const result = MarkdownHelpers.processAssetPaths(content, "assets/");
			expect(result).toBe("![](assets/test.png)");
		});

		it("should handle alt text with spaces", () => {
			const content = "![My Image](../assets/test.png)";
			const result = MarkdownHelpers.processAssetPaths(content, "assets/");
			expect(result).toBe("![My Image](assets/test.png)");
		});

		it("should not modify non-asset paths", () => {
			const content = "![image](https://example.com/image.png)";
			const result = MarkdownHelpers.processAssetPaths(content, "assets/");
			expect(result).toBe("![image](https://example.com/image.png)");
		});

		it("should handle paths with special characters", () => {
			const content = "![image](../assets/test-file_123.png)";
			const result = MarkdownHelpers.processAssetPaths(content, "assets/");
			expect(result).toBe("![image](assets/test-file_123.png)");
		});
	});

	describe("postProcessMarkdown", () => {
		it("should reduce multiple newlines to double", () => {
			const markdown = "Line 1\n\n\n\nLine 2";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toBe("Line 1\n\nLine 2");
		});

		it("should add spacing before headings", () => {
			const markdown = "Text\n# Heading";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toBe("Text\n\n# Heading");
		});

		it("should add spacing after headings", () => {
			const markdown = "# Heading\nText";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toBe("# Heading\n\nText");
		});

		it("should handle multiple heading levels", () => {
			const markdown = "Text\n## H2\nMore text\n### H3\nContent";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toContain("## H2\n\n");
			expect(result).toContain("### H3\n\n");
		});

		it("should not add extra spacing around already spaced headings", () => {
			const markdown = "Text\n\n# Heading\n\nText";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toBe("Text\n\n# Heading\n\nText");
		});

		it("should clean up list formatting", () => {
			const markdown = "Text\n\n- Item 1";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toBe("Text\n- Item 1");
		});

		it("should remove empty list items", () => {
			const markdown = "- Item 1\n- \n- Item 2";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).not.toContain("- \n");
		});

		it("should trim final output", () => {
			const markdown = "  \n\nContent\n\n  ";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toBe("Content");
		});

		it("should handle complex mixed content", () => {
			const markdown = `# Title


Some text

## Section

- Item 1
-
- Item 2


More text`;
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toContain("# Title\n\n");
			// Lists get special formatting - double newline before list becomes single
			expect(result).toContain("## Section\n-");
			expect(result).not.toContain("\n\n\n");
		});

		it("should preserve single newlines in regular content", () => {
			const markdown = "Line 1\nLine 2\nLine 3";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toBe("Line 1\nLine 2\nLine 3");
		});

		it("should handle all heading levels (h1-h6)", () => {
			const markdown = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6";
			const result = MarkdownHelpers.postProcessMarkdown(markdown);
			expect(result).toContain("# H1\n\n");
			expect(result).toContain("###### H6");
		});
	});

	describe("getHeadingLevel", () => {
		it("should extract heading level from direct property", () => {
			const block = { "logseq.property/heading": 1 } as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBe(1);
		});

		it("should extract heading level from properties object", () => {
			const block = {
				properties: { "logseq.property/heading": 2 },
			} as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBe(2);
		});

		it("should extract heading level from DataScript format", () => {
			const block = { ":logseq.property/heading": 3 } as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBe(3);
		});

		it("should return valid level 1", () => {
			const block = { "logseq.property/heading": 1 } as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBe(1);
		});

		it("should return valid level 6", () => {
			const block = { "logseq.property/heading": 6 } as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBe(6);
		});

		it("should return null for level 0", () => {
			const block = { "logseq.property/heading": 0 } as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBeNull();
		});

		it("should return null for level 7", () => {
			const block = { "logseq.property/heading": 7 } as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBeNull();
		});

		it("should return null for negative level", () => {
			const block = { "logseq.property/heading": -1 } as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBeNull();
		});

		it("should return null for non-number value", () => {
			const block = { "logseq.property/heading": "not a number" } as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBeNull();
		});

		it("should return null when property does not exist", () => {
			const block = {} as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBeNull();
		});

		it("should prioritize direct property over properties object", () => {
			const block = {
				"logseq.property/heading": 1,
				properties: { "logseq.property/heading": 2 },
			} as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBe(1);
		});

		it("should handle all valid levels (1-6)", () => {
			for (let i = 1; i <= 6; i++) {
				const block = { "logseq.property/heading": i } as unknown as BlockEntity;
				expect(MarkdownHelpers.getHeadingLevel(block)).toBe(i);
			}
		});

		it("should accept decimal numbers (implementation does not validate integers)", () => {
			// The implementation checks >= 1 && <= 6 but doesn't require integers
			const block = { "logseq.property/heading": 1.5 } as unknown as BlockEntity;
			expect(MarkdownHelpers.getHeadingLevel(block)).toBe(1.5);
		});
	});

	describe("formatYaml", () => {
		it("should format simple string properties", () => {
			const data = { title: "My Title", author: "John Doe" };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toContain("---");
			expect(result).toContain("title: My Title");
			expect(result).toContain("author: John Doe");
		});

		it("should format array properties", () => {
			const data = { tags: ["tag1", "tag2", "tag3"] };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toContain("tags:");
			expect(result).toContain("  - tag1");
			expect(result).toContain("  - tag2");
			expect(result).toContain("  - tag3");
		});

		it("should format multi-line string properties", () => {
			const data = { description: "Line 1\nLine 2\nLine 3" };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toContain("description: |");
			expect(result).toContain("  Line 1");
			expect(result).toContain("  Line 2");
			expect(result).toContain("  Line 3");
		});

		it("should handle empty data object", () => {
			const data = {};
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toBe("---\n---\n");
		});

		it("should handle mixed property types", () => {
			const data = {
				title: "My Title",
				tags: ["tag1", "tag2"],
				description: "Line 1\nLine 2",
			};
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toContain("title: My Title");
			expect(result).toContain("tags:");
			expect(result).toContain("  - tag1");
			expect(result).toContain("description: |");
			expect(result).toContain("  Line 1");
		});

		it("should handle numeric values", () => {
			const data = { count: 42, price: 19.99 };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toContain("count: 42");
			expect(result).toContain("price: 19.99");
		});

		it("should handle boolean values", () => {
			const data = { published: true, draft: false };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toContain("published: true");
			expect(result).toContain("draft: false");
		});

		it("should end with newline", () => {
			const data = { title: "Test" };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toMatch(/\n$/);
		});

		it("should start and end with ---", () => {
			const data = { title: "Test" };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toMatch(/^---\n/);
			expect(result).toMatch(/\n---\n$/);
		});

		it("should handle special characters in values", () => {
			const data = { title: "Title: With Colon", description: 'Quote "test"' };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toContain("Title: With Colon");
			expect(result).toContain('Quote "test"');
		});

		it("should handle empty arrays", () => {
			const data = { tags: [] };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toContain("tags:");
		});

		it("should handle single item arrays", () => {
			const data = { tags: ["single"] };
			const result = MarkdownHelpers.formatYaml(data);
			expect(result).toContain("tags:");
			expect(result).toContain("  - single");
		});
	});

	describe("isImageAsset", () => {
		it("should return true for png", () => {
			expect(MarkdownHelpers.isImageAsset("png")).toBe(true);
		});

		it("should return true for jpg", () => {
			expect(MarkdownHelpers.isImageAsset("jpg")).toBe(true);
		});

		it("should return true for jpeg", () => {
			expect(MarkdownHelpers.isImageAsset("jpeg")).toBe(true);
		});

		it("should return true for gif", () => {
			expect(MarkdownHelpers.isImageAsset("gif")).toBe(true);
		});

		it("should return true for svg", () => {
			expect(MarkdownHelpers.isImageAsset("svg")).toBe(true);
		});

		it("should return true for webp", () => {
			expect(MarkdownHelpers.isImageAsset("webp")).toBe(true);
		});

		it("should return true for bmp", () => {
			expect(MarkdownHelpers.isImageAsset("bmp")).toBe(true);
		});

		it("should return false for pdf", () => {
			expect(MarkdownHelpers.isImageAsset("pdf")).toBe(false);
		});

		it("should return false for txt", () => {
			expect(MarkdownHelpers.isImageAsset("txt")).toBe(false);
		});

		it("should return false for md", () => {
			expect(MarkdownHelpers.isImageAsset("md")).toBe(false);
		});

		it("should return false for zip", () => {
			expect(MarkdownHelpers.isImageAsset("zip")).toBe(false);
		});

		it("should be case insensitive - uppercase", () => {
			expect(MarkdownHelpers.isImageAsset("PNG")).toBe(true);
			expect(MarkdownHelpers.isImageAsset("JPG")).toBe(true);
			expect(MarkdownHelpers.isImageAsset("PDF")).toBe(false);
		});

		it("should be case insensitive - mixed case", () => {
			expect(MarkdownHelpers.isImageAsset("Png")).toBe(true);
			expect(MarkdownHelpers.isImageAsset("JpEg")).toBe(true);
			expect(MarkdownHelpers.isImageAsset("GiF")).toBe(true);
		});

		it("should handle all supported image types", () => {
			const imageTypes = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"];
			imageTypes.forEach((type) => {
				expect(MarkdownHelpers.isImageAsset(type)).toBe(true);
			});
		});

		it("should return false for empty string", () => {
			expect(MarkdownHelpers.isImageAsset("")).toBe(false);
		});

		it("should return false for unknown types", () => {
			expect(MarkdownHelpers.isImageAsset("unknown")).toBe(false);
			expect(MarkdownHelpers.isImageAsset("doc")).toBe(false);
			expect(MarkdownHelpers.isImageAsset("xls")).toBe(false);
		});
	});
});
