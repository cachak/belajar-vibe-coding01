import { Elysia } from "elysia";
import { userModule } from "../modules/users/user.module";
import { authModule } from "../modules/auth/auth.module";

export const app = new Elysia()
  .use(userModule)
  .use(authModule)
  .get("/", () => ({ status: "ok", message: "Server is running!" }));
