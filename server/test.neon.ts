import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testNeon() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Neon Connected:", res.rows);
  } catch (err) {
    console.error("❌ Neon Connection Failed:", err);
  }
}

testNeon();