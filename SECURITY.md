# Security Policy

Do not report secrets or private fantasy data in a public issue. Use GitHub's private vulnerability reporting for security concerns. If a credential was exposed, revoke it immediately before reporting the incident.

This project intentionally provides analysis only. A change that introduces lineup, waiver, drop, or trade mutations is outside its security boundary.

The local connector stores `credentials/client_secret.json` and `credentials/token.json` with owner-only permissions. The entire credentials directory is gitignored except for the example file. The connector:

- performs only HTTPS requests to fixed Yahoo hosts;
- rejects resolved paths outside `/fantasy/v2/` before reading a token;
- exposes no arbitrary raw-request or write tool;
- shares a single token refresh across parallel calls and persists Yahoo's rotated refresh token;
- verifies OAuth state before exchanging an authorization code;
- applies request timeouts and bounds upstream error text.

To revoke access, delete the Yahoo application or revoke its authorization, then remove the two local credential files.
