import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const integrationDir = join(process.cwd(), "src/tests/integration");
const testFiles = readdirSync(integrationDir)
	.filter((entry) => entry.endsWith(".test.ts"))
	.sort()
	.map((entry) => join("src/tests/integration", entry));

for (const testFile of testFiles) {
	const result = spawnSync(
		process.execPath,
		["./node_modules/vitest/vitest.mjs", "run", testFile],
		{
			cwd: process.cwd(),
			stdio: "inherit",
			env: process.env,
		},
	);

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}
