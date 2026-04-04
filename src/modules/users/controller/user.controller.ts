import { Elysia, t } from "elysia";
import { UserService } from "../service/user.service";
import { authMiddleware } from "../../auth/auth.middleware";

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
  )
  .group("", (app) =>
    app
      .use(authMiddleware)
      .get("/me", async ({ userId, userService }: any) => {
        const profile = await userService.getUserById(userId);
        if (!profile) {
          throw new Error("UNAUTHORIZE");
        }
        
        return {
          status: "ok",
          message: "Get user profile successfully",
          data: profile,
        };
      })
  );
