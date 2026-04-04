import { eq, or } from "drizzle-orm";
import { db } from "../../../db/client";
import { users } from "../entity/user.entity";

export class UserRepository {
  async findByEmailOrUsername(email: string, username: string) {
    const result = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)));
    
    return result.length > 0 ? result[0] : null;
  }

  async createUser(data: typeof users.$inferInsert) {
    const [result] = await db.insert(users).values(data);
    
    const createdUser = await db
      .select()
      .from(users)
      .where(eq(users.id, result.insertId));
      
    return createdUser[0];
  }
}
