// scripts/seed/lib/client.mjs
// Lichte HTTP-wrapper rond de Directus REST API.

export async function createClient(env) {
  const baseUrl = env.DIRECTUS_URL.replace(/\/$/, "");

  // Wacht tot Directus bereikbaar is (max 60s)
  await waitUntilReady(baseUrl);

  // Login
  const loginResp = await fetch(`${baseUrl}/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      email:    env.DIRECTUS_ADMIN_EMAIL,
      password: env.DIRECTUS_ADMIN_PASSWORD,
    }),
  });

  if (!loginResp.ok) {
    const text = await loginResp.text();
    throw new Error(
      `Inloggen mislukt (${loginResp.status}). ` +
      `Controleer DIRECTUS_ADMIN_EMAIL/DIRECTUS_ADMIN_PASSWORD in .env.\n${text}`
    );
  }

  const { data } = await loginResp.json();
  const token    = data.access_token;
  console.log("🔐 Ingelogd als admin");

  return {
    baseUrl,
    token,

    async request(method, path, body) {
      const url = `${baseUrl}${path}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const resp = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (resp.status === 204) return null;

      const text = await resp.text();
      let json   = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* niet-JSON antwoord */ }

      if (!resp.ok) {
        const err = new Error(
          `${method} ${path} → ${resp.status} ${resp.statusText}`
        );
        err.errors = json?.errors || text;
        throw err;
      }
      return json;
    },

    get:    function (path)       { return this.request("GET",   path); },
    post:   function (path, body) { return this.request("POST",  path, body); },
    patch:  function (path, body) { return this.request("PATCH", path, body); },
    delete: function (path)       { return this.request("DELETE", path); },
  };
}

async function waitUntilReady(baseUrl, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${baseUrl}/server/ping`);
      if (r.ok) return;
    } catch {
      // niet bereikbaar, probeer opnieuw
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error(
    `Directus niet bereikbaar op ${baseUrl} na ${timeoutMs}ms. ` +
    `Draait \`docker compose up -d\`?`
  );
}
