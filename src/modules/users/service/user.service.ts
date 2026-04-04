import { UserRepository } from "../repository/user.repository";
import type { users } from "../entity/user.entity";

export class UserService {
  private repository = new UserRepository();

  async getUserById(id: number) {
    const user = await this.repository.findById(id);
    if (!user) return null;
    
    // Sensored response
    const { password: _, ...userProfile } = user;
    return userProfile;
  }

  async findByUsernameForAuth(username: string) {
    // Only used by auth module internally. Returns raw entity which includes hashed password.
    return this.repository.findByUsername(username);
  }

  async register(data: typeof users.$inferInsert) {
    const { username, email, password } = data;

    // Check for duplicate
    const existingUser = await this.repository.findByEmailOrUsername(email, username);
    if (existingUser) {
      throw new Error("USER_ALREADY_EXISTS");
    }

    // Hash password
    const hashedPassword = await Bun.password.hash(password);

    // Persist to DB
    const newUser = await this.repository.createUser({
      ...data,
      password: hashedPassword,
    });

    if (!newUser) {
      throw new Error("Failed to create user record");
    }

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }
}
