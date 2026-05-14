import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const tsbuildInfoPath = join(process.cwd(), "tsconfig.tsbuildinfo");

if (existsSync(tsbuildInfoPath)) {
  rmSync(tsbuildInfoPath, { force: true });
  console.log("removed tsconfig.tsbuildinfo");
}

const child = spawn(
  process.execPath,
  ["./node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.json"],
  {
    stdio: "inherit",
    shell: false,
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
