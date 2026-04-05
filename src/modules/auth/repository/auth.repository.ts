import { eq, and } from "drizzle-orm";
import { db } from "../../../db/client";
import { sessions } from "../entity/session.entity";
import { sessionHistory } from "../entity/session-history.entity";

export class AuthRepository {
  async createSession(userId: number, token: string) {
    const [result] = await db.insert(sessions).values({ userId, token });
    return result;
  }

  async deleteSessionByToken(token: string) {
    return await db.delete(sessions).where(eq(sessions.token, token));
  }

  async checkSessionHistoryByToken(token: string) {
    const [history] = await db
      .select()
      .from(sessionHistory)
      .where(eq(sessionHistory.token, token));
    return history;
  }
}
