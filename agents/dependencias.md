# Dependencias

**TLDR:** Express `4.22.3`, `proxy-addr` `2.0.8`, Socket.IO 4.8.x, Auth0 SPA JS servido desde `node_modules`. Tras cambiar deps, corre `snyk test`.

Express queda en `4.22.3`. `overrides.proxy-addr` queda en `2.0.8` (suplantación de usuario en 2.0.7). Socket.IO queda en 4.8.x para arrastrar `engine.io`, `socket.io-parser`, `socket.io-adapter` y `ws` parcheados. El cliente del CDN en `index.html` usa la misma versión 4.x que el servidor.

Auth0 entra con `@auth0/auth0-spa-js` (el navegador lo pide en `/vendor/auth0-spa-js.js`), `express-oauth2-jwt-bearer` y `dotenv`. El secreto no va al cliente. `AUTH0_DOMAIN` y `AUTH0_CLIENT_ID` vacíos dejan el chat abierto para las pruebas.

`snyk test` audita dependencias de producción. Si responde `invalid_grant`, hay que correr `snyk auth` antes de tratarlo como fallo del código. Tras cambiar dependencias, vuelve a correr `snyk test`. Mocha, Jest y Playwright son `devDependencies` y ese comando no las incluye.

Commitea `package-lock.json`. No commitees `node_modules/`. No hagas commit ni push si no te lo piden.
