// netlify/functions/submit.js
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

  try {
    const body = JSON.parse(event.body || "{}");
    const name = String(body.name || "").trim().slice(0, 64);
    const score = Number(body.score);
    const contact_email = body.contact_email || null;

    if (!name || !Number.isFinite(score) || score < 0 || score > 10_000_000) {
      return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "invalid" }) };
    }

    const payload = [{ name, score, contact_email, ua: event.headers["user-agent"] || null, meta: body.meta || null }];

    const r = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const text = await r.text();
      return { statusCode: 502, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "supabase", detail: text }) };
    }

    const inserted = await r.json();
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: true, inserted }) };

  } catch (err) {
    return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "bad_request", detail: String(err) }) };
  }
}
