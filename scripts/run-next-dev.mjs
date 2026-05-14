import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  ["./node_modules/next/dist/bin/next", "dev"],
  {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      PAGEOS_NEXT_DIST: ".next-dev",
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
