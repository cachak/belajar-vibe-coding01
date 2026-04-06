import { AuthRepository } from "../repository/auth.repository";
import { UserService } from "../../users/service/user.service";

export class AuthService {
  private authRepo = new AuthRepository();
  private userService = new UserService();

  async login(username: string, passwordPlain: string, sign: (payload: any) => Promise<string>) {
    // 1. Fetch user records using User Module
    const user = await this.userService.findByUsernameForAuth(username);
    if (!user) {
      throw new Error("USER_OR_PASSWORD_WRONG");
    }

    // 2. Validate password
    const isValid = await Bun.password.verify(passwordPlain, user.password);
    if (!isValid) {
      throw new Error("USER_OR_PASSWORD_WRONG");
    }

    // 3. Generate token
    const token = await sign({ id: user.id, username: user.username });
    
    // 4. Save session to database
    await this.authRepo.createSession(user.id, token);
    
    return token;
  }

  async logout(token: string) {
    // 1. Delete from sessions table
    await this.authRepo.deleteSessionByToken(token);

    // 2. Verify that trigger moved it to history
    const history = await this.authRepo.checkSessionHistoryByToken(token);
    if (!history) {
      throw new Error("LOGOUT_FAILED_HISTORY_MISSING");
    }

    return true;
  }
}
