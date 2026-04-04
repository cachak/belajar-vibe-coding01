import { expect, test, describe, mock } from "bun:test";
import { UserService } from "./user.service";

describe("UserService.register", () => {
  test("should register new user successfully without returning password", async () => {
    // Setup
    const service = new UserService();
    
    // Mock the repository methods
    const findMock = mock(async () => null);
    const createMock = mock(async (data: any) => ({ ...data, id: 1 }));
    
    (service as any).repository = {
      findByEmailOrUsername: findMock,
      createUser: createMock
    };

    const userData = { username: "test_uname", email: "test@domain.com", name: "tester", password: "mypassword123" };
    
    // Execute
    const result = await service.register(userData as any);
    
    // Assert
    expect((result as any).password).toBeUndefined();
    expect(result.username).toBe("test_uname");
    expect(findMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  test("should throw error if user exists", async () => {
    // Setup
    const service = new UserService();
    const findMock = mock(async () => ({ id: 1, email: "exists@mail.com" })); // Represent existing user
    
    (service as any).repository = {
      findByEmailOrUsername: findMock,
    };

    const userData = { username: "test", email: "exists@mail.com", name: "t", password: "pwd" };
    
    // Assert
    expect(service.register(userData as any)).rejects.toThrow("USER_ALREADY_EXISTS");
  });
});
