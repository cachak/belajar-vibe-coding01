import { Elysia } from "elysia";
import { userController } from "./controller/user.controller";

export const userModule = new Elysia().use(userController);
