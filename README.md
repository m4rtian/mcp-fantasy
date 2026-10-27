# MCP Fantasy

[![Tests](https://github.com/m4rtian/mcp-fantasy/actions/workflows/test.yml/badge.svg)](https://github.com/m4rtian/mcp-fantasy/actions/workflows/test.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Node 20+](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-7ce3bb.svg)](LICENSE)

A privacy-conscious, read-only fantasy football assistant for Yahoo Fantasy Sports.

> **Status:** The local, single-user connector implements Yahoo OAuth 2.0 and exposes twelve read-only MCP tools. Credentials and private fantasy data remain local and gitignored.

**[Open the fictional analysis demo](https://m4rtian.github.io/mcp-fantasy/demo.html)**

## Why this project exists

Fantasy managers often have to compare rosters, matchups, standings, available players, and recent transactions across several screens. MCP Fantasy explores a simpler workflow: give an AI assistant authorized, read-only context and use it to support weekly lineup and waiver decisions.

## Current milestone

The project now has two deliberately separate layers:

- a local MCP connector for authorized, read-only league, roster, matchup, player, and transaction context;
- a provider-independent Python analysis package that accepts a sanitized snapshot and produces a deterministic weekly brief.

Neither layer exposes a transaction, lineup, claim, drop, or trade operation.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python -m unittest discover -s tests -v
```

The example fixture is fictional and safe to inspect at `examples/fictional_snapshot.json`.

## Architecture

![Diagram showing data moving from the Yahoo API through a local read-only adapter and deterministic analysis to owner review](docs/architecture.svg)

The local connector handles OAuth and only permits GET requests inside Yahoo's `/fantasy/v2/` API tree. The analysis package remains provider-independent and accepts only a small structured snapshot.

## Local connector setup

Create a Yahoo application with **Fantasy Sports — Read**, a **Confidential Client**, and this exact redirect URI:

```text
https://m4rtian.github.io/mcp-fantasy/callback.html
```

Then install, store the credentials locally, authorize, and verify access:

```bash
npm install
npm run credentials
npm run authorize
npm run check-auth
```

Register the stdio server with an MCP client by pointing it at `connector/index.js`. For Codex:

```bash
codex mcp add yahoo-fantasy -- node /absolute/path/to/mcp-fantasy/connector/index.js
```

The authorization callback page contains no analytics or external assets. It only lets the owner copy the short-lived callback URL back to the local setup process, where the OAuth state is verified before token exchange.

### MCP tools

- games and leagues for the authorized account
- league metadata, settings, standings, teams, scoreboard, and transactions
- team rosters and matchup history
- available-player lists and player search

All twelve tools declare read-only, non-destructive behavior. There is no arbitrary raw-request tool.

## Example interactions

| Input signal | Advisory output |
| --- | --- |
| Healthy player with strong opportunity and matchup | Strong start consideration |
| Player with a non-healthy availability status | Monitor availability |
| Available player with a rising usage trend | Add to waiver watch |

All outputs are observations for owner review—not automated actions.

## Supported analysis workflows

- Summarize league settings, standings, and weekly matchups
- Review the owner's roster and identify lineup considerations
- Compare available players using relevant statistics
- Surface waiver candidates and explain the tradeoffs
- Review transaction history for additional league context

## Safety boundaries

The integration is intentionally narrow:

- **Read-only:** no lineup changes, waiver claims, drops, or trades
- **Single-user:** designed for the project owner's account, not as a public service
- **Local credentials:** OAuth credentials and tokens stay outside this repository
- **Private data stays private:** no league, roster, or account data is committed here
- **Explicit analysis:** recommendations are advisory and require the owner to act separately

## Public repository scope

This repository contains the public site, OAuth callback, local connector source, fictional browser demo, and provider-independent analysis package. Client secrets, OAuth tokens, account data, and private league data are deliberately excluded.

## Limitations

- The demonstration rules are intentionally small and are not projections.
- Fixture data is fictional; outputs do not represent current players or advice.
- The connector covers Yahoo Fantasy Sports data; NFL Pick'em may still require a signed-in browser because it is not part of the same documented fantasy tool surface.
- Fantasy decisions remain uncertain and always require owner judgment.

## Security and privacy

Do not open an issue containing credentials, authorization codes, tokens, cookies, league identifiers, or private league information. If sensitive information is accidentally disclosed, revoke the affected credential before doing anything else.

## Disclaimer

MCP Fantasy is an independent personal project. It is not affiliated with or endorsed by Yahoo. Yahoo and Yahoo Fantasy Sports are trademarks of their respective owners.

## License

MIT
