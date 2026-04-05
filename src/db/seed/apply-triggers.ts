import mysql from "mysql2/promise";

async function applyTriggers() {
  const connection = await mysql.createConnection(
    process.env.DATABASE_URL || "mysql://root:admin4mysql@localhost:33306/belajar_vibe_coding"
  );

  console.log("Applying MySQL Triggers...");

  const dropTriggerSql = "DROP TRIGGER IF EXISTS after_session_delete;";
  const createTriggerSql = `
    CREATE TRIGGER after_session_delete AFTER DELETE ON sessions FOR EACH ROW
    BEGIN
        INSERT INTO session_history (user_id, token, version, status, created_at, updated_at)
        VALUES (OLD.user_id, OLD.token, OLD.version, 'delete', OLD.created_at, CURRENT_TIMESTAMP);
    END;
  `;

  try {
    await connection.query(dropTriggerSql);
    await connection.query(createTriggerSql);
    console.log("MySQL triggers successfully applied.");
  } catch (error) {
    console.error("Failed to apply triggers:", error);
  } finally {
    await connection.end();
  }
}

applyTriggers();
