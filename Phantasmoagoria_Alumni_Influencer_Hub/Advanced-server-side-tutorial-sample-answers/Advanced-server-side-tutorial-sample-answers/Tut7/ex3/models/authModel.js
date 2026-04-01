const db = require("../configs/db");

async function getApiKey(apiKey) {
  const [rows] = await db.query(
    "SELECT * FROM api_keys WHERE api_key = ? AND is_active = TRUE",
    [apiKey],
  );
  return rows[0] || null;
}

module.exports = {
  getApiKey,
};
