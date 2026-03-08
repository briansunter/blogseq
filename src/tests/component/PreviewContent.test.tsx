import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { PreviewContent } from "../../components/PreviewContent";

describe("PreviewContent", () => {
	it("should resolve images from custom asset folders to graph asset files", () => {
		render(
			<PreviewContent
				preview="![Cover](media/550e8400-e29b-41d4-a716-446655440000.png)"
				previewMode="rendered"
				graphPath="/test/graph"
			/>,
		);

		expect(screen.getByAltText("Cover")).toHaveAttribute(
			"src",
			"file:///test/graph/assets/550e8400-e29b-41d4-a716-446655440000.png",
		);
	});

	it("should resolve relative asset links to local file URLs", () => {
		render(
			<PreviewContent
				preview="[PDF](files/550e8400-e29b-41d4-a716-446655440001.pdf)"
				previewMode="rendered"
				graphPath="/test/graph"
			/>,
		);

		expect(screen.getByRole("link", { name: "PDF" })).toHaveAttribute(
			"href",
			"file:///test/graph/assets/550e8400-e29b-41d4-a716-446655440001.pdf",
		);
	});
});
