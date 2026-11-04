## Why

The deployed UNA Chat on Render is open to anyone. Social login through the existing Auth0 SPA should gate that environment without changing local tests that have no Auth0 variables.

## What Changes

- When `AUTH0_DOMAIN` and `AUTH0_CLIENT_ID` are set, the page asks for Auth0 login before the chat connects, shows the signed-in person, and allows logout.
- The socket rejects clients that do not present a valid Auth0 ID token, and messages use that identity.
- Without those variables, the current open chat remains, including the existing composer controls.

## Capabilities

### New Capabilities

- `social-login`: Auth0 sign-in for the deployed chat, off unless the environment is configured.

### Modified Capabilities

- None. The open-chat requirements stay the behavior when Auth0 is not configured.

## Impact

- `server.js`, `index.html`, and new `server/auth.js`.
- Dependencies: `@auth0/auth0-spa-js`, `express-oauth2-jwt-bearer`, `dotenv`.
- Render environment variables. No new GitHub secret.
