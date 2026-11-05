# UNA Chat

Chat Socket.IO. El inicio de sesión con Auth0 se activa solo cuando el proceso tiene `AUTH0_DOMAIN` y `AUTH0_CLIENT_ID`. Sin esas variables el chat queda abierto, que es como corren las pruebas.

## Variables

Copia `.env.example` a `.env` en esta carpeta. No subas `.env`.

| Variable | Dónde | Uso |
|---|---|---|
| `AUTH0_DOMAIN` | Servidor y navegador, vía `/auth/config` | Dominio del tenant, sin `https://` |
| `AUTH0_CLIENT_ID` | Servidor y navegador, vía `/auth/config` | Client ID público |
| `APP_BASE_URL` | Solo el servidor | Origen de esta app, sin barra final. En Render puede usarse `RENDER_EXTERNAL_URL` |
| `VAULT_DATABASE_URL` | Solo el servidor | Conexión TLS del rol `una_chat_backend` hacia Supabase |

No definas `AUTH0_CLIENT_SECRET`. Al arrancar, el proceso lee `una_chat_auth0_client_secret` con la función `una_chat_private.get_auth0_client_secret()` y solo entonces crea el cliente de Auth0. Si Vault no responde, el proceso se detiene. El script de permisos está en `sql/una_chat_vault_access.sql`.

En GitHub no hace falta un secreto nuevo para Auth0: el despliegue ya usa `RENDER_DEPLOY_HOOK_URL`.

## Auth0

Aplicación confidencial (Regular Web Application) con autenticación del token endpoint `client_secret_post`. En Callback URL incluye el camino `/auth/callback`:

- `http://localhost:3000/auth/callback`
- `http://127.0.0.1:3000/auth/callback`
- `https://infosec-unachat-2026.onrender.com/auth/callback`

En Logout URL y Web Origins deja el origen, sin camino:

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `https://infosec-unachat-2026.onrender.com`

El navegador entra por `/auth/login`. El servidor cambia el código por tokens con el secreto que salió de Vault. La ruta protegida es `/sala`.

## Local

```bash
npm install
npm start
```

Abre http://localhost:3000. `npm test` y `npm run test:integration` no deben ver un `.env` con Auth0, o el chat les pedirá token.
