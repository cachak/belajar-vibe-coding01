import { Elysia } from "elysia";
import { authController } from "./controller/auth.controller";

export const authModule = new Elysia().use(authController);
