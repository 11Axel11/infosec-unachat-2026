# AGENTS.md

**TLDR:** Índice del chat UNA. Lee un enlace de `agents/` solo si la tarea toca ese tema, y guarda ahí lo que aprendas.

Chat Socket.IO de la UNA (CommonJS, Express, Socket.IO). Remoto: `master` en `https://github.com/AlexVillegasC/infosec-unachat-2026`. Shell: PowerShell; no uses `&&`.

Este archivo es el índice. No leas los enlaces salvo que la tarea toque ese tema.

## Mantener estas guías

Cuando aprendas algo nuevo que aplique a este repo, escríbelo en el mismo cambio en el archivo de `agents/` que corresponda y actualiza su TLDR. Si no hay uno, crea el archivo, con TLDR, y añade aquí una línea con cuándo leerlo.

No agregues notas de una sola sesión, secretos ni consejos genéricos. Si una regla deja de ser cierta, cámbiala o bórrala. El índice se queda corto; el detalle vive en el enlace.

## Leer solo si hace falta

- Vas a tocar `libs/unalib.js`, el evento del chat o el JSON del mensaje: [agents/validacion.md](agents/validacion.md)
- Vas a correr o cambiar pruebas, `server.js` o selectores de la página: [agents/pruebas.md](agents/pruebas.md)
- Vas a cambiar dependencias, `package.json`, el CDN de Socket.IO o Snyk: [agents/dependencias.md](agents/dependencias.md)
- Vas a tocar Vault, `VAULT_DATABASE_URL` o el Client Secret de Auth0: [agents/vault-auth0.md](agents/vault-auth0.md)
- Vas a cambiar `index.html`, el spec de la página o un cambio de OpenSpec: [agents/interfaz-y-specs.md](agents/interfaz-y-specs.md)
