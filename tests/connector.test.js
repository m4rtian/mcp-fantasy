import assert from "node:assert/strict";
import test from "node:test";

import {
  API_BASE,
  AUTH_ENDPOINT,
  REDIRECT_URI,
  TOKEN_ENDPOINT,
  createTokenStore,
  resolveApiUrl,
} from "../connector/auth.js";
import { registerYahooTools, validateKey } from "../connector/tools.js";

function collectTools() {
  const tools = new Map();
  registerYahooTools({
    registerTool(name, config, handler) {
      tools.set(name, { config, handler });
    },
  });
  return tools;
}

test("exposes only read-only, non-destructive tools", () => {
  const tools = collectTools();
  assert.equal(tools.size, 12);
  for (const [name, tool] of tools) {
    assert.match(name, /^yahoo_/);
    assert.equal(tool.config.annotations.readOnlyHint, true);
    assert.equal(tool.config.annotations.destructiveHint, false);
    assert.doesNotMatch(name, /(add|drop|claim|trade|write|update|delete|raw)/);
  }
});

test("uses only expected HTTPS Yahoo endpoints", () => {
  for (const endpoint of [API_BASE, AUTH_ENDPOINT, TOKEN_ENDPOINT]) {
    const url = new URL(endpoint);
    assert.equal(url.protocol, "https:");
    assert.match(url.hostname, /(^|\.)yahoo(apis)?\.com$/);
  }
  assert.equal(REDIRECT_URI, "https://m4rtian.github.io/mcp-fantasy/callback.html");
});

test("rejects paths outside the Fantasy v2 tree", () => {
  for (const value of ["/../../oauth2/get_token", "/league/%2e%2e/%2e%2e/x", "/.."]) {
    assert.throws(() => resolveApiUrl(value), /Refusing a path outside/);
  }
  assert.equal(
    resolveApiUrl("/league/nfl.l.1/settings").pathname,
    "/fantasy/v2/league/nfl.l.1/settings"
  );
});

test("validates Yahoo resource keys", () => {
  assert.equal(validateKey("game", "nfl"), "nfl");
  assert.equal(validateKey("league", "nfl.l.854760"), "nfl.l.854760");
  assert.equal(validateKey("team", "nfl.l.854760.t.1"), "nfl.l.854760.t.1");
  assert.throws(() => validateKey("league", "../oauth"));
  assert.throws(() => validateKey("team", "nfl.l.854760"));
});

test("parallel expiry shares one refresh and persists the rotated token", async () => {
  const presented = [];
  const saved = [];
  const store = createTokenStore({
    load: async () => ({ access_token: "old", refresh_token: "r1", expires_at: 0 }),
    save: async (token) => saved.push(token),
    refresh: async (token) => {
      presented.push(token.refresh_token);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { access_token: "new", refresh_token: "r2", expires_at: Date.now() + 3_600_000 };
    },
  });
  assert.deepEqual(await Promise.all([store.accessToken(), store.accessToken(), store.accessToken()]), ["new", "new", "new"]);
  assert.deepEqual(presented, ["r1"]);
  assert.equal(saved[0].refresh_token, "r2");
});
