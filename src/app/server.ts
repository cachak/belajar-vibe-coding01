import { Elysia } from "elysia";
import { userModule } from "../modules/users/user.module";

export const app = new Elysia()
  .use(userModule)
  .get("/", () => ({ status: "ok", message: "Server is running!" }));
