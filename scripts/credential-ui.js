import { randomBytes } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import http from "node:http";

import {
  CLIENT_SECRET_PATH,
  CREDENTIALS_DIRECTORY,
  REDIRECT_URI,
} from "../connector/auth.js";

const setupToken = randomBytes(24).toString("hex");
const route = `/setup/${setupToken}`;

function page(message = "", failed = false) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'">
<title>Local Yahoo credential setup</title><style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui,sans-serif}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07111f;color:#eef6ff}main{width:min(560px,calc(100% - 40px));padding:32px;border:1px solid #29405f;border-radius:20px;background:#0d1b2d;box-shadow:0 24px 80px #0008}h1{margin:.3rem 0 1rem}p{color:#b8c7da;line-height:1.55}.notice{color:${failed ? "#ffaaaa" : "#7ce3bb"}}label{display:block;margin:18px 0 7px;font-weight:700}input{box-sizing:border-box;width:100%;padding:13px 14px;border:1px solid #3b5578;border-radius:10px;background:#07111f;color:#fff;font:inherit}button{margin-top:22px;width:100%;padding:14px;border:0;border-radius:11px;background:#7ce3bb;color:#062019;font:inherit;font-weight:800;cursor:pointer}code{overflow-wrap:anywhere;color:#d7e8fc}
</style></head><body><main><p class="notice">Local-only setup · 127.0.0.1</p><h1>Connect the new Yahoo app</h1>
${message ? `<p class="notice">${message}</p>` : ""}
<p>These values are written directly to an owner-only file on this Mac. They are not sent to GitHub, Codex chat, or any external service.</p>
<form method="post" action="${route}" autocomplete="off"><label for="client-id">Client ID</label><input id="client-id" name="client_id" required spellcheck="false">
<label for="client-secret">Client Secret</label><input id="client-secret" name="client_secret" type="password" required spellcheck="false">
<button type="submit">Save locally</button></form><p>Registered callback:<br><code>${REDIRECT_URI}</code></p></main></body></html>`;
}

const server = http.createServer(async (request, response) => {
  if (request.url !== route) {
    response.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    response.end("Not found");
    return;
  }
  if (request.method === "GET") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(page());
    return;
  }
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "GET, POST" });
    response.end();
    return;
  }

  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) {
      response.writeHead(413);
      response.end();
      return;
    }
  }
  const form = new URLSearchParams(body);
  const clientId = (form.get("client_id") ?? "").trim();
  const clientSecret = (form.get("client_secret") ?? "").trim();
  if (!clientId || !clientSecret) {
    response.writeHead(400, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(page("Both fields are required.", true));
    return;
  }

  await mkdir(CREDENTIALS_DIRECTORY, { recursive: true, mode: 0o700 });
  await writeFile(
    CLIENT_SECRET_PATH,
    `${JSON.stringify({ client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECT_URI }, null, 2)}\n`,
    { mode: 0o600 }
  );
  await chmod(CLIENT_SECRET_PATH, 0o600);
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  response.end(page("Saved. You can close this page and return to Codex."));
  console.log("Yahoo credentials saved locally. The setup server is shutting down.");
  setTimeout(() => server.close(), 500);
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  console.log(`SETUP_URL=http://127.0.0.1:${address.port}${route}`);
});
