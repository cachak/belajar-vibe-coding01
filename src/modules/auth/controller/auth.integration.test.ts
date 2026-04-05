import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from "../../../app/server";
import { db } from "../../../db/client";
import { users } from "../../users/entity/user.entity";
import { sessions } from "../entity/session.entity";
import { sessionHistory } from "../entity/session-history.entity";
import { eq } from "drizzle-orm";

describe("Integration: POST /api/v1/auth/login", () => {
  const TEST_USERNAME = "auth_integrator";
  let createdUserId: number;

  beforeAll(async () => {
    // 1. Thorough Cleanup of GLOBAL state for this test's username
    // This handles cases where a previous run crashed or left data
    // Order matters because deleting sessions triggers history creation!
    await db.delete(sessions);
    await db.delete(sessionHistory);
    await db.delete(users).where(eq(users.username, TEST_USERNAME));
    
    // 2. Insert fresh test user
    const [result] = await db.insert(users).values({
      username: TEST_USERNAME,
      email: "auth@integrate.com",
      name: "Auth Integrator",
      password: await Bun.password.hash("supersecret")
    });
    createdUserId = result.insertId;
  });

  afterAll(async () => {
    // order matters: delete sessions FIRST (which fires the trigger and populates history),
    // THEN delete sessionHistory, THEN users.
    await db.delete(sessions);
    await db.delete(sessionHistory);
    await db.delete(users).where(eq(users.id, createdUserId));
  });

  test("successfully logins and creates session in db", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USERNAME, password: "supersecret" })
      })
    );

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.data.token).toBe("string");

    // MUST validate db directly!
    const sessionRecords = await db.select().from(sessions).where(eq(sessions.userId, createdUserId));
    expect(sessionRecords.length).toBeGreaterThan(0);
    expect(sessionRecords[sessionRecords.length - 1].token).toBe(body.data.token);
  });

  test("returns 401 USER_OR_PASSWORD_WRONG when bad creds provided", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USERNAME, password: "fakepassword" })
      })
    );

    expect(res.status).toBe(401);
    const body: any = await res.json();
    expect(body.status).toBe("error");
    expect(body.message).toBe("User atau password salah");
  });

  test("GET /api/v1/auth/me should return user profile with valid token", async () => {
    // 1. Get token first
    const loginRes = await app.handle(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USERNAME, password: "supersecret" })
      })
    );
    const loginBody: any = await loginRes.json();
    const token = loginBody.data.token;

    // 2. Fetch profile
    const profileRes = await app.handle(
      new Request("http://localhost/api/v1/auth/me", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      })
    );

    expect(profileRes.status).toBe(200);
    const profileBody: any = await profileRes.json();
    expect(profileBody.status).toBe("ok");
    expect(profileBody.data.username).toBe(TEST_USERNAME);
    expect(profileBody.data.password).toBeUndefined(); // ensure password is not leaked
  });

  test("GET /api/v1/users/me should return equivalent user profile", async () => {
    // 1. Get token first
    const loginRes = await app.handle(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USERNAME, password: "supersecret" })
      })
    );
    const loginBody: any = await loginRes.json();
    const token = loginBody.data.token;

    // 2. Fetch profile from users module
    const profileRes = await app.handle(
      new Request("http://localhost/api/v1/users/me", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      })
    );

    expect(profileRes.status).toBe(200);
    const profileBody: any = await profileRes.json();
    expect(profileBody.status).toBe("ok");
    expect(profileBody.data.username).toBe(TEST_USERNAME);
    expect(profileBody.data.password).toBeUndefined();
  });

  test("GET /api/v1/auth/me should fail with 401 on invalid token", async () => {
    const profileRes = await app.handle(
      new Request("http://localhost/api/v1/auth/me", {
        method: "GET",
        headers: { "Authorization": `Bearer falsy_token` }
      })
    );

    expect(profileRes.status).toBe(401);
    const profileBody: any = await profileRes.json();
    expect(profileBody.status).toBe("error");
    expect(profileBody.message).toBe("Unauthorized");
    expect(profileBody.errors[0].code).toBe("UNAUTHORIZE");
  });

  test("GET /api/v1/auth/logout should logout successfully and invalidate token", async () => {
    // 1. Login to get a fresh token
    const loginRes = await app.handle(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USERNAME, password: "supersecret" })
      })
    );
    const loginBody: any = await loginRes.json();
    const token = loginBody.data.token;

    // 2. Logout
    const logoutRes = await app.handle(
      new Request("http://localhost/api/v1/auth/logout", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      })
    );

    expect(logoutRes.status).toBe(200);
    const logoutBody: any = await logoutRes.json();
    expect(logoutBody.status).toBe("ok");
    expect(logoutBody.message).toBe("Logout successfully");

    // 3. Try to use the same token again (should fail)
    const profileRes = await app.handle(
      new Request("http://localhost/api/v1/auth/me", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      })
    );

    expect(profileRes.status).toBe(401);
  });
});
