/**
 * Automated PostgreSQL Database & Schema Initializer (`npm run db:init`)
 * 1. Connects to local PostgreSQL (`postgres` default DB) to create `bada_english` DB if missing.
 * 2. Connects to `bada_english` and runs `schema.postgres.sql` + initial seed via `initPostgresPoolIfConfigured()`.
 */

const { initPostgresPoolIfConfigured, getDbEngineInfo } = require("../db");

async function main() {
  console.log("🐘 [BADA Postgres Init] 로컬/원격 PostgreSQL 데이터베이스 초기화를 시작합니다...");

  let Client = null;
  try {
    ({ Client } = require("pg"));
  } catch (_) {
    console.error("❌ 'pg' 패키지가 설치되어 있지 않습니다. 먼저 터미널에서 `npm install`을 실행해 주세요.");
    process.exit(1);
  }

  const host = process.env.PGHOST || "localhost";
  const port = Number(process.env.PGPORT) || 5432;
  const user = process.env.PGUSER || "postgres";
  const password = process.env.PGPASSWORD || "postgres";
  const targetDb = process.env.PGDATABASE || "bada_english";

  if (!process.env.DATABASE_URL) {
    process.env.USE_POSTGRES = "true";
    try {
      const adminClient = new Client({ host, port, user, password, database: "postgres" });
      await adminClient.connect();
      const checkRes = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb]);
      if (checkRes.rowCount === 0) {
        await adminClient.query(`CREATE DATABASE "${targetDb}"`);
        console.log(`✅ PostgreSQL 데이터베이스 '${targetDb}'를 새로 생성했습니다!`);
      } else {
        console.log(`ℹ️ PostgreSQL 데이터베이스 '${targetDb}'가 이미 존재합니다.`);
      }
      await adminClient.end();
    } catch (err) {
      console.warn(`⚠️ 기본 'postgres' DB 접속 안내: ${err.message}`);
      console.warn("👉 .env 파일의 PGPASSWORD 또는 DATABASE_URL 값을 로컬 PostgreSQL 비밀번호에 맞게 수정해 주세요.");
    }
  }

  const ok = await initPostgresPoolIfConfigured();
  const info = getDbEngineInfo();
  if (ok && info.postgresConnected) {
    console.log("🎉 [완료] PostgreSQL 테이블 생성 및 초기 학생/원서 데이터 시딩이 완료되었습니다!");
    process.exit(0);
  } else {
    console.error("❌ PostgreSQL 연결에 실패했습니다. .env 파일의 접속 정보를 확인해 주세요.");
    process.exit(1);
  }
}

main();

