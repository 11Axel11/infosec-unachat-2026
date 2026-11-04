## Why

A signed-in person can already reach the room, but the chat window only shows a short session label. The Auth0 profile already carries the name, email, and photo, and the photo should be the one Google hosts.

## What Changes

- When Auth0 sign-in succeeds, the chat window shows that person's name, email, and profile photo.
- The photo is loaded from Google's resource server only when the picture URL is https on `googleusercontent.com`. Any other picture URL is ignored.
- Sign-out still clears that identity. Chat without Auth0 configuration is unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `social-login`: The signed-in chat window shows name, email, and the Google profile photo.

## Impact

- `index.html`, `libs/profile.js`, and a `/profile.js` route in `server.js`.
- No new Auth0 scope, secret, or dependency. `openid profile email` is already what the SPA requests.
