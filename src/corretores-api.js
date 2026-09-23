const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });

const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

function b64url(bytes) {
  const s = typeof bytes === "string"
    ? bytes
    : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function unb64url(s) {
  const b = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4);
  return Uint8Array.from(atob(b), c => c.charCodeAt(0));
}

async function signToken(payload, secret) {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(head + "." + body));
  return head + "." + body + "." + b64url(sig);
}

async function verifyToken(token, secret) {
  try {
    const [head, body, sig] = token.split(".");
    if (!head || !body || !sig) return false;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "HMAC", key, unb64url(sig), new TextEncoder().encode(head + "." + body)
    );
    if (!ok) return false;
    const payload = JSON.parse(new TextDecoder().decode(unb64url(body)));
    return payload.exp > Math.floor(Date.now() / 1000) && payload.role === "admin";
  } catch {
    return false;
  }
}

async function adminAuth(request) {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret) return false;
  const value = request.headers.get("authorization") || "";
  if (!value.toLowerCase().startsWith("bearer ")) return false;
  return verifyToken(value.slice(7), secret);
}

function apiUrl(path = "") {
  const base = process.env.NEON_REST_API_URL;
  if (!base) throw new Error("NEON_REST_API_URL não configurada");
  return base + path;
}

async function neonFetch(path, init = {}) {
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "*";
    const headers = cors(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/auth/login" && request.method === "POST") {
        const { password } = await request.json();
        const expected = process.env.ADMIN_PASSWORD;
        const secret = process.env.ADMIN_TOKEN_SECRET;
        if (!expected || !secret || typeof password !== "string" || password !== expected) {
          return json({ error: "Credenciais inválidas" }, 401, headers);
        }
        const token = await signToken({
          role: "admin",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
        }, secret);
        return json({ token, expires_in: 28800 }, 200, headers);
      }

      if (path === "/briefings" && request.method === "POST") {
        const body = await request.text();
        const r = await neonFetch("?select=*", {
          method: "POST",
          body,
          headers: { Prefer: "return=minimal" },
        });
        return new Response(await r.text(), {
          status: r.status,
          headers: { ...headers, "Content-Type": r.headers.get("Content-Type") || "application/json" },
        });
      }

      if (path === "/admin/briefings") {
        if (!(await adminAuth(request))) return json({ error: "Não autorizado" }, 401, headers);
        const r = await neonFetch("?select=*&order=id.desc");
        return new Response(await r.text(), {
          status: r.status,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      const match = path.match(/^\/admin\/briefings\/(\d+)$/);
      if (match) {
        if (!(await adminAuth(request))) return json({ error: "Não autorizado" }, 401, headers);
        const id = encodeURIComponent(match[1]);
        if (request.method === "PATCH") {
          const r = await neonFetch("?id=eq." + id, {
            method: "PATCH",
            body: await request.text(),
            headers: { Prefer: "return=minimal" },
          });
          return new Response(await r.text(), { status: r.status, headers });
        }
        if (request.method === "DELETE") {
          const r = await neonFetch("?id=eq." + id, {
            method: "DELETE",
            headers: { Prefer: "return=minimal" },
          });
          return new Response(await r.text(), { status: r.status, headers });
        }
      }

      return json({ error: "Rota não encontrada" }, 404, headers);
    } catch (error) {
      console.error(error);
      return json({ error: "Erro interno", detail: error.message }, 500, headers);
    }
  },
};
