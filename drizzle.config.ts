import { defineConfig } from "drizzle-kit"

export default defineConfig({
  out: "./migrations",
  schema: "./server/db/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
})
