## Why

The Auth0 client secret should live in Supabase Vault, and the Render process should load it before creating the Auth0 client. A copy in `AUTH0_CLIENT_SECRET` is the thing this change retires.

## What Changes

- Startup reads `una_chat_auth0_client_secret` through `una_chat_private.get_auth0_client_secret()` over TLS, then initializes `@auth0/auth0-auth-js`.
- Login is an authorization-code exchange on the server. `/sala` is the protected route.
- Vault, permission, or Auth0 rejection stops the process with a log line that has no secret.
- `anon`, `authenticated`, and `PUBLIC` cannot execute the function or read Vault.

## Capabilities

### Modified Capabilities

- `social-login`: sign-in uses the server-side code exchange, and the client secret is loaded from Vault.

## Impact

- `server.js`, `server/auth.js`, `server/vault.js`, `index.html`.
- Dependencies: `@auth0/auth0-auth-js`, `pg`. `@auth0/auth0-spa-js` leaves the browser.
- Render: `VAULT_DATABASE_URL`. Remove `AUTH0_CLIENT_SECRET` after a successful login.
- SQL in `sql/una_chat_vault_access.sql`. No secret values in git.
