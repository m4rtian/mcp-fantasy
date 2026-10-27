import { randomBytes } from "node:crypto";
import readline from "node:readline/promises";

import {
  AUTH_ENDPOINT,
  REDIRECT_URI,
  TOKEN_ENDPOINT,
  basicAuthHeader,
  loadClientSecret,
  saveToken,
} from "../connector/auth.js";
import { fetchWithTimeout, responseError } from "../connector/shared.js";

const { client_id: clientId, client_secret: clientSecret } = await loadClientSecret();
const state = randomBytes(24).toString("hex");
const authorizationUrl = new URL(AUTH_ENDPOINT);
authorizationUrl.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  state,
  language: "en-us",
}).toString();

console.log("\nOpen this Yahoo authorization URL:\n");
console.log(authorizationUrl.toString());
console.log("\nAfter approval, the MCP Fantasy callback page will open.");

const input = readline.createInterface({ input: process.stdin, output: process.stdout });
const callbackText = (await input.question("Paste the full callback URL from that page: ")).trim();
input.close();

const callbackUrl = new URL(callbackText);
const expectedCallback = new URL(REDIRECT_URI);
if (callbackUrl.origin !== expectedCallback.origin || callbackUrl.pathname !== expectedCallback.pathname) {
  throw new Error(`Unexpected callback page. Expected ${REDIRECT_URI}`);
}
if (callbackUrl.searchParams.get("state") !== state) {
  throw new Error("OAuth state mismatch. Start authorization again and use the newest callback URL.");
}
const authorizationCode = callbackUrl.searchParams.get("code");
if (!authorizationCode) {
  throw new Error(`Yahoo did not return an authorization code: ${callbackUrl.searchParams.get("error") ?? "unknown error"}`);
}

const response = await fetchWithTimeout(
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
if (!response.ok) {
  throw await responseError(response, "Yahoo authorization", TOKEN_ENDPOINT);
}
const data = await response.json();
if (!data.access_token || !data.refresh_token || !Number.isFinite(data.expires_in)) {
  throw new Error("Yahoo returned an incomplete token response.");
}

await saveToken({
  access_token: data.access_token,
  refresh_token: data.refresh_token,
  expires_at: Date.now() + data.expires_in * 1000,
});
console.log("Authorization saved locally. Run: npm run check-auth");
