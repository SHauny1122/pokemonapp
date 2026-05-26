import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "build"], {
  env: {
    ...process.env,
    CAPACITOR_EXPORT: "true",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
