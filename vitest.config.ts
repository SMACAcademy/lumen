import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "content", "apps/web"],
  },
});
