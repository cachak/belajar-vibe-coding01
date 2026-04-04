import { db } from "../../../db/client";
import { sessions } from "../entity/session.entity";

export class AuthRepository {
  async createSession(userId: number, token: string) {
    const [result] = await db.insert(sessions).values({ userId, token });
    return result;
  }
}
