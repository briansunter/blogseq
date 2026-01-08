import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Simple UUID generator for testing (not cryptographically secure)
function generateTestUuid(): string {
	const timestamp = Date.now().toString(16);
	const random1 = Math.random().toString(16).substring(2, 10);
	const random2 = Math.random().toString(16).substring(2, 10);
	const random3 = Math.random().toString(16).substring(2, 10);
	const random4 = Math.random().toString(16).substring(2, 14);

	return `${random1}-${random2.substring(0, 4)}-${random2.substring(4, 8)}-${random3.substring(0, 4)}-${timestamp}${random4}`;
}

// Validate UUID format
function validateUuid(uuid: string): void {
	if (!UUID_REGEX.test(uuid)) {
		throw new Error(
			`Invalid UUID format: ${uuid}. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
		);
	}
}

// Validate heading level
function validateHeadingLevel(level: number): void {
	if (!Number.isInteger(level) || level < 1 || level > 6) {
		throw new Error(`Invalid heading level: ${level}. Must be an integer between 1 and 6`);
	}
}

/**
 * Builder for creating test PageEntity objects
 */
export class PageBuilder {
	private page: PageEntity;
	private validateOnBuild = false;

	constructor() {
		this.page = {
			id: Math.floor(Math.random() * 1000000),
			uuid: generateTestUuid(),
			name: "Test Page",
			originalName: "Test Page",
			"journal?": false,
			properties: {},
			children: [],
		};
	}

	/**
	 * Enable validation when building (throws errors on invalid data)
	 */
	withValidation(): this {
		this.validateOnBuild = true;
		return this;
	}

	withUuid(uuid: string): this {
		if (this.validateOnBuild) {
			validateUuid(uuid);
		}
		this.page.uuid = uuid;
		return this;
	}

	withId(id: number): this {
		this.page.id = id;
		return this;
	}

	withName(name: string): this {
		this.page.name = name;
		this.page.originalName = name;
		return this;
	}

	withProperty(key: string, value: unknown): this {
		if (!this.page.properties) {
			this.page.properties = {};
		}
		this.page.properties[key] = value;
		return this;
	}

	withProperties(properties: Record<string, unknown>): this {
		this.page.properties = { ...this.page.properties, ...properties };
		return this;
	}

	withBlocks(blocks: BlockEntity[]): this {
		// Note: PageEntity.children is typed as PageEntity[], but in practice
		// it can contain blocks. This is a quirk of the Logseq API.
		this.page.children = blocks as unknown as PageEntity[];
		return this;
	}

	/**
	 * Mark as journal page
	 */
	asJournalPage(): this {
		this.page["journal?"] = true;
		return this;
	}

	/**
	 * Add multiple properties from a fluent API
	 */
	withAuthor(author: string): this {
		return this.withProperty("user.property/author", author);
	}

	withTags(...tags: string[]): this {
		return this.withProperty("user.property/tags", tags);
	}

	withDate(date: string): this {
		return this.withProperty("user.property/date", date);
	}

	/**
	 * Clone this builder to create variations
	 */
	clone(): PageBuilder {
		const cloned = new PageBuilder();
		cloned.page = {
			...this.page,
			properties: { ...this.page.properties },
			children: this.page.children ? [...this.page.children] : [],
		};
		cloned.validateOnBuild = this.validateOnBuild;
		return cloned;
	}

	build(): PageEntity {
		if (this.validateOnBuild) {
			validateUuid(this.page.uuid);
		}
		return this.page;
	}
}

/**
 * Builder for creating test BlockEntity objects
 */
export class BlockBuilder {
	private block: BlockEntity;
	private validateOnBuild = false;

	constructor() {
		this.block = {
			id: Math.floor(Math.random() * 1000000),
			uuid: generateTestUuid(),
			content: "Test block content",
			format: "markdown",
			children: [],
			left: { id: 1 },
			parent: { id: 2 },
			page: { id: 100 },
		};
	}

	/**
	 * Enable validation when building (throws errors on invalid data)
	 */
	withValidation(): this {
		this.validateOnBuild = true;
		return this;
	}

	withUuid(uuid: string): this {
		if (this.validateOnBuild) {
			validateUuid(uuid);
		}
		this.block.uuid = uuid;
		return this;
	}

	withId(id: number): this {
		this.block.id = id;
		return this;
	}

	withContent(content: string): this {
		this.block.content = content;
		return this;
	}

	/**
	 * Append content to existing content
	 */
	appendContent(content: string): this {
		this.block.content = `${this.block.content} ${content}`.trim();
		return this;
	}

	/**
	 * Prepend content to existing content
	 */
	prependContent(content: string): this {
		this.block.content = `${content} ${this.block.content}`.trim();
		return this;
	}

	withProperty(key: string, value: unknown): this {
		if (!this.block.properties) {
			this.block.properties = {};
		}
		this.block.properties[key] = value;
		return this;
	}

	withProperties(properties: Record<string, unknown>): this {
		this.block.properties = { ...this.block.properties, ...properties };
		return this;
	}

	withHeadingLevel(level: number): this {
		if (this.validateOnBuild) {
			validateHeadingLevel(level);
		}
		if (!this.block.properties) {
			this.block.properties = {};
		}
		this.block.properties["logseq.property/heading"] = level;
		return this;
	}

	withChildren(children: BlockEntity[]): this {
		this.block.children = children;
		return this;
	}

	/**
	 * Add a single child block
	 */
	addChild(child: BlockEntity): this {
		if (!this.block.children) {
			this.block.children = [];
		}
		this.block.children.push(child);
		return this;
	}

	withParent(parentId: number): this {
		this.block.parent = { id: parentId };
		return this;
	}

	withLeft(leftId: number): this {
		this.block.left = { id: leftId };
		return this;
	}

	withPage(pageId: number): this {
		this.block.page = { id: pageId };
		return this;
	}

	withFormat(format: "markdown" | "org"): this {
		this.block.format = format;
		return this;
	}

	asPropertyOnly(properties: Record<string, string>): this {
		const propertyContent = Object.entries(properties)
			.map(([key, value]) => `${key}:: ${value}`)
			.join("\n");
		this.block.content = propertyContent;
		return this;
	}

	withBlockReference(uuid: string): this {
		if (this.validateOnBuild) {
			validateUuid(uuid);
		}
		this.block.content = `${this.block.content} ((${uuid}))`;
		return this;
	}

	withPageReference(pageName: string): this {
		this.block.content = `${this.block.content} [[${pageName}]]`;
		return this;
	}

	/**
	 * Add tag to block content
	 */
	withTag(tag: string): this {
		this.block.content = `${this.block.content} #${tag}`;
		return this;
	}

	/**
	 * Add multiple tags
	 */
	withTags(...tags: string[]): this {
		tags.forEach((tag) => this.withTag(tag));
		return this;
	}

	/**
	 * Mark block as a quote block
	 */
	asQuoteBlock(): this {
		if (!this.block.properties) {
			this.block.properties = {};
		}
		this.block.properties["logseq.property.node/display-type"] = ":quote";
		return this;
	}

	/**
	 * Mark block as a code block
	 */
	asCodeBlock(language?: string): this {
		if (!this.block.properties) {
			this.block.properties = {};
		}
		this.block.properties["logseq.property.node/display-type"] = ":code";
		if (language) {
			this.block.properties["logseq.property.code/lang"] = language;
		}
		return this;
	}

	/**
	 * Clone this builder to create variations
	 */
	clone(): BlockBuilder {
		const cloned = new BlockBuilder();
		cloned.block = {
			...this.block,
			properties: this.block.properties ? { ...this.block.properties } : undefined,
			children: this.block.children ? [...this.block.children] : [],
		};
		cloned.validateOnBuild = this.validateOnBuild;
		return cloned;
	}

	build(): BlockEntity {
		if (this.validateOnBuild) {
			validateUuid(this.block.uuid);
			if (this.block.properties?.["logseq.property/heading"]) {
				validateHeadingLevel(this.block.properties["logseq.property/heading"] as number);
			}
		}
		return this.block;
	}
}

/**
 * Builder for creating test asset objects
 */
export class AssetBuilder {
	private asset: {
		uuid: string;
		title: string;
		type: string;
		properties: Record<string, unknown>;
	};

	constructor() {
		this.asset = {
			uuid: generateTestUuid(),
			title: "Test Asset",
			type: "png",
			properties: {
				"logseq.property.asset/type": "png",
			},
		};
	}

	withUuid(uuid: string): this {
		this.asset.uuid = uuid;
		return this;
	}

	withTitle(title: string): this {
		this.asset.title = title;
		return this;
	}

	withType(type: string): this {
		this.asset.type = type;
		this.asset.properties["logseq.property.asset/type"] = type;
		return this;
	}

	asImage(type: "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" | "bmp" = "png"): this {
		return this.withType(type);
	}

	asPdf(): this {
		return this.withType("pdf");
	}

	asDocument(type: "doc" | "docx" | "txt" | "md" = "md"): this {
		return this.withType(type);
	}

	withProperty(key: string, value: unknown): this {
		this.asset.properties[key] = value;
		return this;
	}

	build() {
		return this.asset;
	}

	/**
	 * Build as a BlockEntity (for use in getBlock/getPage responses)
	 */
	buildAsBlock(): BlockEntity {
		return {
			id: Math.floor(Math.random() * 1000000),
			uuid: this.asset.uuid,
			content: "",
			format: "markdown",
			properties: this.asset.properties,
			children: [],
			left: { id: 1 },
			parent: { id: 2 },
			page: { id: 100 },
		};
	}

	/**
	 * Build as a PageEntity (for use in getPage responses)
	 */
	buildAsPage(): PageEntity {
		return {
			id: Math.floor(Math.random() * 1000000),
			uuid: this.asset.uuid,
			name: this.asset.title,
			originalName: this.asset.title,
			"journal?": false,
			properties: this.asset.properties,
			children: [],
		};
	}
}

/**
 * Builder for creating test graph objects
 */
export class GraphBuilder {
	private graph: { path: string; name?: string };

	constructor() {
		this.graph = {
			path: "/Users/test/logseq-graph",
			name: "Test Graph",
		};
	}

	withPath(path: string): this {
		this.graph.path = path;
		return this;
	}

	withName(name: string): this {
		this.graph.name = name;
		return this;
	}

	build() {
		return this.graph;
	}
}

/**
 * Helper function to create a tree of blocks with parent-child relationships
 */
export function createBlockTree(
	rootContent: string,
	children: Array<{ content: string; children?: Array<{ content: string }> }>,
): BlockEntity {
	const root = new BlockBuilder().withContent(rootContent).build();

	root.children = children.map((child, index) => {
		const childBlock = new BlockBuilder()
			.withContent(child.content)
			.withParent(index + 1)
			.build();

		if (child.children) {
			childBlock.children = child.children.map((grandchild, gIndex) =>
				new BlockBuilder()
					.withContent(grandchild.content)
					.withParent(gIndex + 100)
					.build(),
			);
		}

		return childBlock;
	});

	return root;
}

/**
 * Helper function to create a page with a complete block tree
 */
export function createPageWithBlocks(
	pageName: string,
	blocks: Array<{
		content: string;
		properties?: Record<string, unknown>;
		children?: BlockEntity[];
	}>,
): PageEntity {
	const page = new PageBuilder().withName(pageName).build();

	const builtBlocks = blocks.map((blockConfig) => {
		const builder = new BlockBuilder().withContent(blockConfig.content);

		if (blockConfig.properties) {
			builder.withProperties(blockConfig.properties);
		}

		const block = builder.build();

		if (blockConfig.children) {
			block.children = blockConfig.children;
		}

		return block;
	});

	// Note: PageEntity.children is typed as PageEntity[], but in practice
	// it can contain blocks. This is a quirk of the Logseq API.
	page.children = builtBlocks as unknown as PageEntity[];

	return page;
}

/**
 * Factory methods for common patterns
 */

/**
 * Create a blog post page with typical structure
 */
export function createBlogPost(options: {
	title: string;
	author?: string;
	tags?: string[];
	date?: string;
	sections?: Array<{ heading: string; content: string }>;
}): PageEntity {
	const page = new PageBuilder()
		.withName(options.title)
		.withProperty("user.property/type", "blog-post");

	if (options.author) {
		page.withAuthor(options.author);
	}

	if (options.tags) {
		page.withTags(...options.tags);
	}

	if (options.date) {
		page.withDate(options.date);
	}

	const blocks: BlockEntity[] = [];

	if (options.sections) {
		options.sections.forEach((section) => {
			// Add heading block
			blocks.push(new BlockBuilder().withContent(section.heading).withHeadingLevel(2).build());

			// Add content block
			blocks.push(new BlockBuilder().withContent(section.content).build());
		});
	}

	return page.withBlocks(blocks).build();
}

/**
 * Create a notes page with hierarchical structure
 */
export function createNotesPage(options: {
	title: string;
	topics: Array<{
		heading: string;
		level?: number;
		notes: string[];
	}>;
}): PageEntity {
	const page = new PageBuilder()
		.withName(options.title)
		.withProperty("user.property/type", "notes");

	const blocks: BlockEntity[] = [];

	options.topics.forEach((topic) => {
		// Add topic heading
		const headingBlock = new BlockBuilder()
			.withContent(topic.heading)
			.withHeadingLevel(topic.level || 2)
			.build();

		// Add notes as children
		headingBlock.children = topic.notes.map((note) => new BlockBuilder().withContent(note).build());

		blocks.push(headingBlock);
	});

	return page.withBlocks(blocks).build();
}

/**
 * Create a journal page for a specific date
 */
export function createJournalPage(date: string): PageEntity {
	const dateObj = new Date(date);
	const monthNames = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const formattedDate = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}${getDaySuffix(dateObj.getDate())}, ${dateObj.getFullYear()}`;

	return new PageBuilder().withName(formattedDate).asJournalPage().withDate(date).build();
}

function getDaySuffix(day: number): string {
	if (day >= 11 && day <= 13) return "th";
	switch (day % 10) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
}

/**
 * Create a documentation page with API references
 */
export function createDocumentationPage(options: {
	title: string;
	version?: string;
	sections: Array<{
		heading: string;
		description: string;
		examples?: string[];
	}>;
}): PageEntity {
	const page = new PageBuilder()
		.withName(options.title)
		.withProperty("user.property/type", "documentation");

	if (options.version) {
		page.withProperty("user.property/version", options.version);
	}

	const blocks: BlockEntity[] = [];

	options.sections.forEach((section) => {
		// Section heading
		blocks.push(new BlockBuilder().withContent(section.heading).withHeadingLevel(2).build());

		// Description
		blocks.push(new BlockBuilder().withContent(section.description).build());

		// Examples
		if (section.examples) {
			const examplesBlock = new BlockBuilder().withContent("Examples").withHeadingLevel(3).build();

			examplesBlock.children = section.examples.map((example) =>
				new BlockBuilder().withContent(example).build(),
			);

			blocks.push(examplesBlock);
		}
	});

	return page.withBlocks(blocks).build();
}

/**
 * Create a task page with checkboxes
 */
export function createTaskPage(options: {
	title: string;
	tasks: Array<{ description: string; completed?: boolean }>;
}): PageEntity {
	const page = new PageBuilder()
		.withName(options.title)
		.withProperty("user.property/type", "tasks");

	const blocks = options.tasks.map((task) =>
		new BlockBuilder()
			.withContent(`${task.completed ? "DONE" : "TODO"} ${task.description}`)
			.build(),
	);

	return page.withBlocks(blocks).build();
}
