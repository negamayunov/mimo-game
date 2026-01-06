// netlify/functions/top.js
export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
      }
    };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  const q = new URLSearchParams(event.queryStringParameters || {});
  const limit = Math.min(100, Number(q.get("limit") || 10));

  const r = await fetch(`${SUPABASE_URL}/rest/v1/scores?select=*&order=score.desc&limit=${limit}`, {
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE}`
    }
  });

  if (!r.ok) {
    const text = await r.text();
    return { statusCode: 502, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "supabase", detail: text }) };
  }
  const data = await r.json();
  return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(data) };
}
