import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as userSchema from "../modules/users/entity/user.entity";
import * as sessionSchema from "../modules/auth/entity/session.entity";

const connection = mysql.createPool(process.env.DATABASE_URL!);

export const db = drizzle(connection, { schema: { ...userSchema, ...sessionSchema }, mode: "default" });
