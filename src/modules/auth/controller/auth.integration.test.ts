import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from "../../../app/server";
import { db } from "../../../db/client";
import { users } from "../../users/entity/user.entity";
import { sessions } from "../entity/session.entity";
import { eq } from "drizzle-orm";

describe("Integration: POST /api/v1/auth/login", () => {
  const TEST_USERNAME = "auth_integrator";
  let createdUserId: number;

  beforeAll(async () => {
    // Inject fake user
    await db.delete(users).where(eq(users.username, TEST_USERNAME));
    
    const [result] = await db.insert(users).values({
      username: TEST_USERNAME,
      email: "auth@integrate.com",
      name: "Auth Integrator",
      password: await Bun.password.hash("supersecret")
    });
    createdUserId = result.insertId;
    
    // Ensure any stale sessions are cleared
    await db.delete(sessions).where(eq(sessions.userId, createdUserId));
  });

  afterAll(async () => {
    await db.delete(sessions).where(eq(sessions.userId, createdUserId));
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
    expect(profileBody.errors[0].code).toBe("UNAUTHORIZE");
  });
});
