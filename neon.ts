import { defineConfig } from "@neondatabase/config/v1";

export default defineConfig({
  preview: {
    functions: {
      corretoresapi: {
        name: "Corretores API",
        source: "src/corretores-api.js",
      },
    },
  },
});
