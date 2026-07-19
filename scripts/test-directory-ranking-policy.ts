import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const publicDirectoryRoutes = [
  "web/src/app/(directory)/businesses/page.tsx",
  "web/src/app/(directory)/[suburb]/[service]/page.tsx",
];

async function run() {
  for (const route of publicDirectoryRoutes) {
    const source = await readFile(route, "utf8");
    assert.doesNotMatch(source, /\.order\(["']tier["']/, `${route} must not rank public results by commercial tier`);
    assert.match(source, /\.order\(["']business_name["']/, `${route} must have a deterministic non-commercial ordering`);
  }

  console.log("Public directory ranking policy tests passed.");
}

await run();
