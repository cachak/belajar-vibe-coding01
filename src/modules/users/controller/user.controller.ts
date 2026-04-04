import { Elysia, t } from "elysia";
import { UserService } from "../service/user.service";

export const userController = new Elysia({ prefix: "/api/v1/users" })
  .decorate("userService", new UserService())
  .post(
    "/",
    async ({ body, userService, set }) => {
      try {
        const user = await userService.register(body);
        set.status = 201;
        return {
          status: "ok",
          message: "User created successfully",
          data: user,
        };
      } catch (error: any) {
        if (error.message === "USER_ALREADY_EXISTS") {
          set.status = 409;
          return {
            status: "error",
            message: "User already exists",
            errors: [
              {
                code: "USER_ALREADY_EXISTS",
                message: "User already exists",
              },
            ],
          };
        }
        
        set.status = 500;
        return {
          status: "error",
          message: "Internal server error",
          errors: [{ code: "INTERNAL_ERROR", message: error.message }],
        };
      }
    },
    {
      body: t.Object({
        username: t.String(),
        email: t.String({ format: "email" }), // Validate email format
        name: t.String(),
        password: t.String(),
      }),
    }
  );
