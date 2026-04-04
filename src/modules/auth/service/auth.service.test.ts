import { expect, test, describe, mock } from "bun:test";
import { AuthService } from "./auth.service";

describe("AuthService.login", () => {
  test("successfully validates credentials and signs JWT", async () => {
    const service = new AuthService();

    // Mock UserService returns valid user
    const mockFindUser = mock(async () => ({
      id: 1,
      username: "test",
      password: await Bun.password.hash("mypassword") 
    }));
    (service as any).userService = { findByUsernameForAuth: mockFindUser };

    // Mock AuthRepository session creation
    const mockCreateSession = mock(async () => {});
    (service as any).authRepo = { createSession: mockCreateSession };

    // Fake jwt sign callback
    const fakeSign = async (payload: any) => "ey.fake.token";

    // execute
    const token = await service.login("test", "mypassword", fakeSign);

    expect(token).toBe("ey.fake.token");
    expect(mockFindUser).toHaveBeenCalledTimes(1);
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
  });

  test("throws error when user not found or bad password", async () => {
    const service = new AuthService();
    
    // User not found
    (service as any).userService = { findByUsernameForAuth: mock(async () => null) };
    expect(service.login("test", "mypassword", async () => "")).rejects.toThrow("USER_OR_PASSWORD_WRONG");

    // Bad password
    const mockFindUser = mock(async () => ({
      id: 1,
      username: "test",
      password: await Bun.password.hash("mypassword") 
    }));
    (service as any).userService = { findByUsernameForAuth: mockFindUser };
    
    expect(service.login("test", "wrongpassword", async () => "")).rejects.toThrow("USER_OR_PASSWORD_WRONG");
  });
});
