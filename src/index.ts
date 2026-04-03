import { Elysia } from "elysia";
import { db } from "./db";
import { users } from "./db/schema";

const app = new Elysia()
  .get("/", () => ({
    status: "ok",
    message: "Elysia + Drizzle + MySQL is running!",
  }))
  .get("/test-db", async () => {
    try {
      // Test the connection by selecting users
      const allUsers = await db.select().from(users);
      return {
        status: "ok",
        database: "connected",
        userCount: allUsers.length,
      };
    } catch (error) {
      console.error("Database connection failed:", error);
      return {
        status: "error",
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);