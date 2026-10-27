import { randomBytes } from "node:crypto";
import http from "node:http";

import {
  REDIRECT_URI,
  TOKEN_ENDPOINT,
  basicAuthHeader,
  loadClientSecret,
  saveToken,
} from "../connector/auth.js";
import { fetchWithTimeout, responseError } from "../connector/shared.js";

const expectedState = process.argv[2];
if (!expectedState) throw new Error("Expected OAuth state argument is required.");
const localToken = randomBytes(24).toString("hex");
const route = `/complete/${localToken}`;

const server = http.createServer(async (request, response) => {
  try {
    const localUrl = new URL(request.url, "http://127.0.0.1");
    if (request.method !== "GET" || localUrl.pathname !== route) {
      response.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      response.end("Not found");
      return;
    }
    const callbackUrl = new URL(localUrl.searchParams.get("callback") ?? "");
    const expectedCallback = new URL(REDIRECT_URI);
    if (callbackUrl.origin !== expectedCallback.origin || callbackUrl.pathname !== expectedCallback.pathname) {
      throw new Error("Unexpected OAuth callback page.");
    }
    if (callbackUrl.searchParams.get("state") !== expectedState) {
      throw new Error("OAuth state mismatch.");
    }
    const authorizationCode = callbackUrl.searchParams.get("code");
    if (!authorizationCode) throw new Error("The OAuth callback has no authorization code.");

    const { client_id: clientId, client_secret: clientSecret } = await loadClientSecret();
    const tokenResponse = await fetchWithTimeout(
      TOKEN_ENDPOINT,
      {
        method: "POST",
        headers: {
          Authorization: basicAuthHeader(clientId, clientSecret),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
          code: authorizationCode,
        }),
      },
      "Yahoo token endpoint"
    );
    if (!tokenResponse.ok) {
      throw await responseError(tokenResponse, "Yahoo authorization", TOKEN_ENDPOINT);
    }
    const data = await tokenResponse.json();
    if (!data.access_token || !data.refresh_token || !Number.isFinite(data.expires_in)) {
      throw new Error("Yahoo returned an incomplete token response.");
    }
    await saveToken({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    });
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end("<!doctype html><meta charset=utf-8><title>Yahoo connected</title><style>body{font-family:system-ui;background:#07111f;color:#eef6ff;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:560px;padding:32px;border:1px solid #29405f;border-radius:20px;background:#0d1b2d}h1{color:#7ce3bb}</style><main><h1>Yahoo connected</h1><p>The read-only OAuth token is stored locally. Return to Codex for verification.</p></main>");
    console.log("Yahoo OAuth token saved locally.");
    setTimeout(() => server.close(), 500);
  } catch (error) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end(`Authorization failed: ${error.message}`);
    console.error(`Authorization failed: ${error.message}`);
    setTimeout(() => server.close(), 500);
  }
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  console.log(`COMPLETE_URL=http://127.0.0.1:${address.port}${route}`);
});
