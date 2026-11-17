import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const children = [
  spawn("npx vite --host 127.0.0.1 --port 5173 --strictPort", {
    stdio: "inherit",
    shell: true,
    cwd,
  }),
  spawn("node server/index.mjs", {
    stdio: "inherit",
    shell: true,
    cwd,
  }),
];

let stopping = false;

function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { shell: true, stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
}

for (const child of children) {
  child.on("exit", (code) => {
    if (stopping) return;
    shutdown();
    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
