import { execFileSync } from "node:child_process";

if (process.env.NODE_ENV !== "production") {
  execFileSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["exec", "husky"], {
    stdio: "inherit",
  });
}
