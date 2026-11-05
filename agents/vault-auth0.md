# Vault y Auth0

**TLDR:** Con `AUTH0_DOMAIN` y `AUTH0_CLIENT_ID`, `node server.js` lee `una_chat_auth0_client_secret` por `VAULT_DATABASE_URL` y solo después crea el SDK. Si falla, el proceso sale. El valor no se escribe en logs, respuestas ni en git.

El rol de la conexión es `una_chat_backend`. Solo puede ejecutar `una_chat_private.get_auth0_client_secret()`. Esa función es `security definer`, fija `search_path` y devuelve un único secreto. `anon`, `authenticated` y `PUBLIC` no ejecutan la función ni leen `vault.decrypted_secrets`. El SQL versionado está en `sql/una_chat_vault_access.sql`. La contraseña del rol vive solo en `VAULT_DATABASE_URL`.

`pg` conecta con `rejectUnauthorized: true` y confía además en `server/supabase-root-2021-ca.pem`, la raíz pública del pooler. El host directo `db.PROJECT_REF.supabase.co` es IPv6. En una red solo IPv4 se usa el session pooler, con el usuario `una_chat_backend.PROJECT_REF`. Una URI de ejemplo, sin clave, está en `.env.example`. `AUTH0_CLIENT_SECRET` en el entorno se ignora y se avisa por ese nombre, nunca por su valor.

El SDK es `@auth0/auth0-auth-js` y arma la URL de login. El intercambio del código es un POST directo al token endpoint, porque Auth0 responde `403` y el SDK lo trata como respuesta inválida. `invalid_grant` en el arranque significa que el secreto fue aceptado. `invalid_client` detiene el proceso. El log no incluye el secreto ni el código.

La aplicación de Auth0 es confidencial, con `client_secret_post`. El callback es `{APP_BASE_URL}/auth/callback`. `/sala` exige la cookie httpOnly del ID token. Sin las variables de Auth0, `server.js` no abre Vault y las pruebas siguen con el chat abierto. Node 20 o superior.
