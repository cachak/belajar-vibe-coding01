import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as userSchema from "../modules/users/entity/user.entity";
import * as sessionSchema from "../modules/auth/entity/session.entity";
import * as sessionHistorySchema from "../modules/auth/entity/session-history.entity";

const connection = mysql.createPool(process.env.DATABASE_URL!);

export const db = drizzle(connection, { schema: { ...userSchema, ...sessionSchema, ...sessionHistorySchema }, mode: "default" });
