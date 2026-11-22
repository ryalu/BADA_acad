/**
 * Upserts `data/vocab_master.json` into the active PostgreSQL or SQLite database (`npm run vocab:seed`).
 */

const { initPostgresPoolIfConfigured, syncVocabMasterData, getDbEngineInfo } = require("../db");

async function main() {
  await initPostgresPoolIfConfigured();
  const info = getDbEngineInfo();
  console.log(`📚 [BADA Vocab Seed] Engine: ${info.engine.toUpperCase()}`);
  const result = await syncVocabMasterData();
  console.log(
    `✅ 적재 완료: 유닛 ${result.units}개 · 단어 ${result.words}개 · 3단계 어근/접사 확장 ${result.affixItems}개`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ [BADA Vocab Seed] 실패:", err);
  process.exit(1);
});
