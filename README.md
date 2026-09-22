# MCP Fantasy

A privacy-conscious, read-only fantasy football assistant for Yahoo Fantasy Sports.

> **Status:** Milestone 1 is live: a browser-only analysis demo using fictional data. Yahoo API access and the integration security review are still pending.

**[Open the fictional analysis demo](https://m4rtian.github.io/mcp-fantasy/demo.html)**

## Why this project exists

Fantasy managers often have to compare rosters, matchups, standings, available players, and recent transactions across several screens. MCP Fantasy explores a simpler workflow: give an AI assistant authorized, read-only context and use it to support weekly lineup and waiver decisions.

## Planned capabilities

- Summarize league settings, standings, and weekly matchups
- Review the owner's roster and identify lineup considerations
- Compare available players using relevant statistics
- Surface waiver candidates and explain the tradeoffs
- Review transaction history for additional league context

## Safety boundaries

The planned integration is intentionally narrow:

- **Read-only:** no lineup changes, waiver claims, drops, or trades
- **Single-user:** designed for the project owner's account, not as a public service
- **Local credentials:** OAuth credentials and tokens stay outside this repository
- **Private data stays private:** no league, roster, or account data is committed here
- **Explicit analysis:** recommendations are advisory and require the owner to act separately

## Planned architecture

```text
Yahoo Fantasy Sports API
          │
          │ authorized read-only requests
          ▼
 Local MCP integration
          │
          │ selected fantasy context
          ▼
     AI assistant
          │
          ▼
 Lineup and waiver analysis
```

## Public repository scope

This repository contains the static informational site and a fictional, browser-only decision brief. The private integration, local configuration, authorization material, and account data are deliberately excluded.

## Security and privacy

Do not open an issue containing credentials, authorization codes, tokens, cookies, league identifiers, or private league information. If sensitive information is accidentally disclosed, revoke the affected credential before doing anything else.

## Disclaimer

MCP Fantasy is an independent personal project. It is not affiliated with or endorsed by Yahoo. Yahoo and Yahoo Fantasy Sports are trademarks of their respective owners.
