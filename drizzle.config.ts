import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/modules/users/entity/user.entity.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
