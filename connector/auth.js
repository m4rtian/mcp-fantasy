import { chmod, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchWithTimeout, responseError } from "./shared.js";

const connectorDirectory = path.dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(connectorDirectory, "..");
export const CREDENTIALS_DIRECTORY = path.join(PROJECT_ROOT, "credentials");
export const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIRECTORY, "client_secret.json");
export const TOKEN_PATH = path.join(CREDENTIALS_DIRECTORY, "token.json");

export const REDIRECT_URI = "https://m4rtian.github.io/mcp-fantasy/callback.html";
export const AUTH_ENDPOINT = "https://api.login.yahoo.com/oauth2/request_auth";
export const TOKEN_ENDPOINT = "https://api.login.yahoo.com/oauth2/get_token";
export const API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";

export async function loadClientSecret() {
  const raw = await readFile(CLIENT_SECRET_PATH, "utf8").catch(() => {
    throw new Error(`Missing ${CLIENT_SECRET_PATH}. Run \"npm run credentials\" first.`);
  });
  const parsed = JSON.parse(raw);
  if (!parsed.client_id || !parsed.client_secret) {
    throw new Error("The Yahoo credential file is missing client_id or client_secret.");
  }
  if ((parsed.redirect_uri ?? REDIRECT_URI) !== REDIRECT_URI) {
    throw new Error(`The Yahoo redirect URI must be exactly ${REDIRECT_URI}`);
  }
  return parsed;
}

export function basicAuthHeader(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function saveToken(token) {
  await writeFile(TOKEN_PATH, `${JSON.stringify(token, null, 2)}\n`, { mode: 0o600 });
  await chmod(TOKEN_PATH, 0o600);
}

export function createTokenStore({ load, save, refresh, skewMs = 60_000 }) {
  let token;
  let loading;
  let pendingRefresh;

  return {
    async accessToken() {
      loading ??= load().catch((error) => {
        loading = undefined;
        throw error;
      });
      token ??= await loading;

      if (Date.now() >= token.expires_at - skewMs) {
        pendingRefresh ??= (async () => {
          const next = await refresh(token);
          token = next;
          await save(next);
        })().finally(() => {
          pendingRefresh = undefined;
        });
        await pendingRefresh;
      }
      return token.access_token;
    },
  };
}

async function refreshWithYahoo(currentToken) {
  const { client_id: clientId, client_secret: clientSecret } = await loadClientSecret();
  const response = await fetchWithTimeout(
    TOKEN_ENDPOINT,
    {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(clientId, clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        redirect_uri: REDIRECT_URI,
        refresh_token: currentToken.refresh_token,
      }),
    },
    "Yahoo token endpoint"
  );
  if (!response.ok) {
    throw await responseError(response, "Yahoo token refresh", TOKEN_ENDPOINT);
  }
  const data = await response.json();
  if (typeof data.access_token !== "string" || !Number.isFinite(data.expires_in)) {
    throw new Error(`Yahoo token refresh failed: ${data.error ?? "invalid token response"}`);
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? currentToken.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

const tokenStore = createTokenStore({
  load: async () => {
    const raw = await readFile(TOKEN_PATH, "utf8").catch(() => {
      throw new Error(`No OAuth token found. Run \"npm run authorize\" first.`);
    });
    return JSON.parse(raw);
  },
  save: saveToken,
  refresh: refreshWithYahoo,
});

export function resolveApiUrl(requestPath) {
  if (!requestPath.startsWith("/")) {
    throw new Error("Yahoo API paths must start with /.");
  }
  const base = new URL(API_BASE);
  const url = new URL(`${API_BASE}${requestPath}`);
  if (url.origin !== base.origin || !url.pathname.startsWith(`${base.pathname}/`)) {
    throw new Error(`Refusing a path outside ${base.pathname}/.`);
  }
  return url;
}

export async function yahooGet(requestPath, query = {}) {
  const url = resolveApiUrl(requestPath);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set("format", "json");

  const accessToken = await tokenStore.accessToken();
  const response = await fetchWithTimeout(
    url,
    { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
    "Yahoo Fantasy API"
  );
  if (!response.ok) {
    throw await responseError(response, "Yahoo Fantasy API", requestPath);
  }
  return response.json();
}
