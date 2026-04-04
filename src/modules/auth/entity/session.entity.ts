import { mysqlTable, serial, int, bigint, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { users } from "../../users/entity/user.entity";

export const sessions = mysqlTable("sessions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull(),
  version: int("version").default(1),
  status: mysqlEnum("status", ["active", "inactive", "delete"]).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .onUpdateNow(),
});
