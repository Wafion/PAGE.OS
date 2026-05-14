import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const mode = process.argv[2] ?? "all";

const targetsByMode = {
  all: [".next", ".next-dev", join("node_modules", ".cache")],
  build: [".next"],
  dev: [".next-dev"],
};

const targets = targetsByMode[mode] ?? targetsByMode.all;

for (const target of targets) {
  const fullPath = join(cwd, target);

  if (!existsSync(fullPath)) {
    console.log(`skip ${target}`);
    continue;
  }

  rmSync(fullPath, { recursive: true, force: true });
  console.log(`removed ${target}`);
}
