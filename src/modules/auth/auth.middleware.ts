import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";

export const authMiddleware = (app: Elysia) => 
  app
    .use(
      jwt({
        name: "jwt",
        secret: process.env.JWT_SECRET || "super-secret-default-key",
      })
    )
    .derive(async ({ jwt, headers }) => {
      const authHeader = headers.authorization as string | undefined;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("UNAUTHORIZE_HEADER");
      }

      const token = authHeader.split(" ")[1];
      const payload = await jwt.verify(token);

      if (!payload || !payload.id) {
        throw new Error("UNAUTHORIZE_TOKEN");
      }

      return {
        userId: payload.id as number,
      };
    });
