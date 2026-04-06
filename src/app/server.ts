import { Elysia } from "elysia";
import { userModule } from "../modules/users/user.module";
import { authModule } from "../modules/auth/auth.module";

export const app = new Elysia()
  .onError(({ error, set }) => {
    const err = error as Error;
    if (err.message && err.message.startsWith("UNAUTHORIZE")) {
      set.status = 401;
      return {
        status: "error",
        message: "Unauthorized",
        errors: [{ code: "UNAUTHORIZE", message: "Unauthorized" }],
      };
    }
  })
  .use(userModule)
  .use(authModule)
  .get("/", () => ({ status: "ok", message: "Server is running!" }));
