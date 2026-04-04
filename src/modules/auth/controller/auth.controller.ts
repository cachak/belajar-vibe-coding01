import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { AuthService } from "../service/auth.service";

export const authController = new Elysia({ prefix: "/api/v1/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super-secret-default-key",
    })
  )
  .decorate("authService", new AuthService())
  .post(
    "/login",
    async ({ body, authService, jwt, set }) => {
      try {
        const token = await authService.login(body.username, body.password, (payload) => jwt.sign(payload));
        
        return {
          status: "ok",
          message: "User login successfully",
          data: {
            token,
          },
        };
      } catch (error: any) {
        if (error.message === "USER_OR_PASSWORD_WRONG") {
          set.status = 401;
          return {
            status: "error",
            message: "User atau password salah",
            errors: [
              {
                code: "USER_OR_PASSWORD_WRONG",
                message: "User atau password salah",
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
        password: t.String(),
      }),
    }
  );
