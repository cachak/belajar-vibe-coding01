import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from "../../../app/server";
import { db } from "../../../db/client";
import { users } from "../entity/user.entity";
import { sessions } from "../../auth/entity/session.entity";
import { sessionHistory } from "../../auth/entity/session-history.entity";
import { eq } from "drizzle-orm";

describe("Integration: POST /api/v1/users", () => {
  const TEST_USERNAME = "integrations_test_user";

  beforeAll(async () => {
    // Clean up specific test data before starting
    await db.delete(sessions);
    await db.delete(sessionHistory);
    await db.delete(users).where(eq(users.username, TEST_USERNAME));
  });

  afterAll(async () => {
    // Clean up after tests are done
    await db.delete(sessions);
    await db.delete(sessionHistory);
    await db.delete(users).where(eq(users.username, TEST_USERNAME));
  });

  test("successfully creates a new user via API", async () => {
    const payload = {
      username: TEST_USERNAME,
      email: "integrate@domain.com",
      name: "Integration Tester",
      password: "secret_password!"
    };

    const res = await app.handle(
      new Request("http://localhost/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    );

    expect(res.status).toBe(201);
    
    const body: any = await res.json();
    expect(body.status).toBe("ok");
    expect(body.data.username).toBe(TEST_USERNAME);
    expect(body.data.password).toBeUndefined();

    // Verification directly to Database Layer via Drizzle
    const dbUser = await db.select().from(users).where(eq(users.username, TEST_USERNAME));
    expect(dbUser.length).toBe(1);
    expect(dbUser[0]?.email).toBe("integrate@domain.com");
  });

  test("returns error for duplicate registration (409 Conflict)", async () => {
    // This will use the same payload as before, which is now already in the DB
    const payload = {
      username: TEST_USERNAME,
      email: "integrate@domain.com",
      name: "Integration Tester",
      password: "secret_password!"
    };

    const res = await app.handle(
      new Request("http://localhost/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    );

    // Should encounter error
    expect(res.status).toBe(409);
    const body: any = await res.json();
    expect(body.status).toBe("error");
    expect(body.message).toBe("User already exists");
    expect(body.errors[0].code).toBe("USER_ALREADY_EXISTS");
  });
  
  test("returns 422 for incomplete payload validation failure", async () => {
    const badPayload = { username: "fail_validation" }; // Missing required fields and email
    const res = await app.handle(
      new Request("http://localhost/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badPayload)
      })
    );
    expect(res.status).toBe(422); // 422 Unprocessable Entity by Elysia TypeBox validator
  });

  test("returns 422 for invalid email format", async () => {
    const payload = {
      username: "invalid_email_user",
      email: "not-an-email",
      name: "Invalid Email",
      password: "password123"
    };

    const res = await app.handle(
      new Request("http://localhost/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    );

    expect(res.status).toBe(422);
  });

  test("returns 422 for exceeding 255 character validation limit", async () => {
    const bigPayload = {
      username: "long_name_test",
      email: "long@test.com",
      name: "A".repeat(300),
      password: "pass"
    };

    const res = await app.handle(
      new Request("http://localhost/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bigPayload)
      })
    );

    expect(res.status).toBe(422); 
  });

  test("GET /api/v1/users/me returns 401 when no authorization header", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/v1/users/me", {
        method: "GET"
      })
    );

    expect(res.status).toBe(401);
  });

  test("GET /api/v1/users/me returns 401 with invalid token", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/v1/users/me", {
        method: "GET",
        headers: { "Authorization": "Bearer invalid_token" }
      })
    );

    expect(res.status).toBe(401);
  });
});
