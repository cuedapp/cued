import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    env: { DATABASE_URL: "postgresql://cued:cued@localhost:5432/cued", LOG_LEVEL: "error" },
    coverage: { reporter: ["text", "html"] }
  },
});
