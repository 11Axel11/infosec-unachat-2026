var crypto = require('crypto');

var KNOWN_OAUTH_ERRORS = [
  'invalid_grant',
  'invalid_client',
  'unauthorized_client',
  'access_denied',
  'invalid_request',
  'server_error'
];

var ID_COOKIE = 'una_chat_id_token';
var TXN_COOKIE = 'una_chat_oauth';

var authClient = null;
var txnKey = null;
var jwtMiddleware = null;
var ready = false;

function authSettings() {
  var domain = process.env.AUTH0_DOMAIN;
  var clientId = process.env.AUTH0_CLIENT_ID;
  if (!domain || !clientId) return null;
  return { domain: domain, clientId: clientId };
}

function appBaseUrl() {
  var raw = process.env.APP_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';
  raw = String(raw).trim().replace(/\/$/, '');
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(raw)) return raw;
  if (/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(raw)) return raw;
  return '';
}

function oauthErrorCode(err) {
  var cause = err && err.cause;
  var value = cause && typeof cause.error === 'string' ? cause.error : '';
  if (KNOWN_OAUTH_ERRORS.indexOf(value) !== -1) return value;
  return 'unknown';
}

function isReady() {
  return ready;
}

function callbackUrl() {
  return appBaseUrl() + '/auth/callback';
}

function initAuth0(clientSecret) {
  if (typeof clientSecret !== 'string' || clientSecret.length < 16) {
    return Promise.reject(new Error('Vault returned an unusable Auth0 client secret.'));
  }
  var settings = authSettings();
  if (!settings) {
    return Promise.reject(new Error('AUTH0_DOMAIN and AUTH0_CLIENT_ID are required before initializing Auth0.'));
  }
  var base = appBaseUrl();
  if (!base) {
    return Promise.reject(new Error('APP_BASE_URL or RENDER_EXTERNAL_URL is required before initializing Auth0.'));
  }

  var AuthClient = require('@auth0/auth0-auth-js').AuthClient;
  authClient = new AuthClient({
    domain: settings.domain,
    clientId: settings.clientId,
    clientSecret: clientSecret,
    authorizationParams: {
      redirect_uri: base + '/auth/callback',
      scope: 'openid profile email'
    }
  });
  txnKey = crypto.createHmac('sha256', clientSecret).update('una-chat-oauth-txn-v1').digest();

  return probeClientSecret(clientSecret).then(function () {
    verifier();
    ready = true;
  });
}

function probeClientSecret(clientSecret) {
  var settings = authSettings();
  var body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: settings.clientId,
    client_secret: clientSecret,
    code: 'vault-startup-probe',
    redirect_uri: callbackUrl(),
    code_verifier: crypto.randomBytes(32).toString('base64url')
  });
  return fetch('https://' + settings.domain + '/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body
  }).then(function (res) {
    return res.json().catch(function () { return {}; });
  }).then(function (payload) {
    var code = payload && typeof payload.error === 'string' ? payload.error : '';
    if (KNOWN_OAUTH_ERRORS.indexOf(code) === -1) code = 'unknown';
    if (code === 'invalid_grant') return;
    if (code === 'invalid_client' || code === 'unauthorized_client' || code === 'access_denied') {
      throw new Error('Auth0 rejected the client secret.');
    }
    throw new Error('Auth0 did not accept the client secret (' + code + ').');
  });
}

function verifier() {
  if (!jwtMiddleware) {
    var settings = authSettings();
    if (!settings) throw new Error('Auth0 is not configured.');
    var auth = require('express-oauth2-jwt-bearer').auth;
    jwtMiddleware = auth({
      audience: settings.clientId,
      issuerBaseURL: 'https://' + settings.domain + '/',
      tokenSigningAlg: 'RS256'
    });
  }
  return jwtMiddleware;
}

function senderName(payload) {
  if (!payload) return 'Usuario';
  var name = payload.name || payload.email || payload.nickname;
  if (typeof name !== 'string' || !name.trim()) return 'Usuario';
  return name.trim();
}

function readCookie(req, name) {
  var header = req.headers && req.headers.cookie;
  if (!header || typeof header !== 'string') return '';
  var parts = header.split(';');
  for (var i = 0; i < parts.length; i++) {
    var piece = parts[i].trim();
    var eq = piece.indexOf('=');
    if (eq === -1) continue;
    if (piece.slice(0, eq) === name) {
      try {
        return decodeURIComponent(piece.slice(eq + 1));
      } catch (e) {
        return '';
      }
    }
  }
  return '';
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: appBaseUrl().indexOf('https://') === 0,
    path: '/',
    maxAge: maxAgeMs
  };
}

function sealTxn(payload) {
  var body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  var mac = crypto.createHmac('sha256', txnKey).update(body).digest('base64url');
  return body + '.' + mac;
}

function openTxn(value) {
  if (!txnKey || typeof value !== 'string') return null;
  var dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  var body = value.slice(0, dot);
  var mac = value.slice(dot + 1);
  var expected = crypto.createHmac('sha256', txnKey).update(body).digest('base64url');
  var given = Buffer.from(mac);
  var wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) return null;
  try {
    var parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.state !== 'string' || typeof parsed.verifier !== 'string') return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function sameString(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  var a = Buffer.from(left);
  var b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function redirectToTenant(res, target) {
  var settings = authSettings();
  var parsed;
  try {
    parsed = target instanceof URL ? target : new URL(String(target));
  } catch (e) {
    res.status(500).type('text/plain').send('No se pudo preparar Auth0.');
    return;
  }
  if (!settings || parsed.protocol !== 'https:' || parsed.host !== settings.domain) {
    res.status(500).type('text/plain').send('No se pudo preparar Auth0.');
    return;
  }
  res.redirect(parsed.toString());
}

function beginLogin(req, res) {
  if (!ready || !authClient) {
    res.status(503).type('text/plain').send('El inicio de sesión no está listo.');
    return;
  }
  var nonce = crypto.randomBytes(16).toString('hex');
  authClient.buildAuthorizationUrl({
    authorizationParams: {
      redirect_uri: callbackUrl(),
      scope: 'openid profile email',
      nonce: nonce
    }
  }).then(function (result) {
    var state = result.authorizationUrl.searchParams.get('state') || '';
    if (!state || !result.codeVerifier) {
      res.status(500).type('text/plain').send('No se pudo preparar Auth0.');
      return;
    }
    res.cookie(TXN_COOKIE, sealTxn({
      state: state,
      nonce: nonce,
      verifier: result.codeVerifier
    }), cookieOptions(10 * 60 * 1000));
    redirectToTenant(res, result.authorizationUrl);
  }).catch(function (err) {
    console.error('Auth0 login URL failed:', oauthErrorCode(err));
    res.redirect('/?error=login_unavailable');
  });
}

function finishLogin(req, res) {
  if (!ready || !authClient) {
    res.status(503).type('text/plain').send('El inicio de sesión no está listo.');
    return;
  }
  res.clearCookie(TXN_COOKIE, cookieOptions(0));
  if (req.query && req.query.error) {
    res.redirect('/?error=access_denied');
    return;
  }
  var code = req.query && typeof req.query.code === 'string' ? req.query.code : '';
  var state = req.query && typeof req.query.state === 'string' ? req.query.state : '';
  var txn = openTxn(readCookie(req, TXN_COOKIE));
  if (!code || code.length > 512 || !txn || !sameString(txn.state, state)) {
    res.redirect('/?error=state');
    return;
  }

  var url = new URL(callbackUrl());
  url.searchParams.set('code', code);
  url.searchParams.set('state', state);
  authClient.getTokenByCode(url, { codeVerifier: txn.verifier }).then(function (tokens) {
    var idToken = tokens && tokens.idToken;
    var claims = tokens && tokens.claims;
    if (typeof idToken !== 'string' || !claims || !sameString(claims.nonce, txn.nonce)) {
      res.redirect('/?error=login_failed');
      return;
    }
    var lifetime = 60 * 60 * 8 * 1000;
    if (typeof claims.exp === 'number') {
      lifetime = Math.max(60 * 1000, (claims.exp * 1000) - Date.now());
    }
    res.cookie(ID_COOKIE, idToken, cookieOptions(lifetime));
    res.redirect('/');
  }).catch(function (err) {
    console.error('Auth0 code exchange failed:', oauthErrorCode(err));
    res.redirect('/?error=login_failed');
  });
}

function logout(req, res) {
  res.clearCookie(ID_COOKIE, cookieOptions(0));
  res.clearCookie(TXN_COOKIE, cookieOptions(0));
  if (!ready || !authClient) {
    res.redirect('/');
    return;
  }
  var base = appBaseUrl();
  authClient.buildLogoutUrl({ returnTo: base + '/' }).then(function (url) {
    redirectToTenant(res, url);
  }).catch(function (err) {
    console.error('Auth0 logout URL failed:', oauthErrorCode(err));
    res.redirect('/');
  });
}

function verifyToken(token) {
  return new Promise(function (resolve, reject) {
    var statusCode = 200;
    var req = {
      headers: { authorization: 'Bearer ' + token },
      protocol: 'https',
      originalUrl: '/sala',
      url: '/sala',
      method: 'GET',
      socket: {},
      app: { get: function () { return undefined; } },
      get: function (name) {
        return String(name).toLowerCase() === 'host' ? 'localhost' : undefined;
      },
      is: function () { return false; }
    };
    var res = {
      status: function (code) {
        statusCode = code;
        return this;
      },
      setHeader: function () { return this; },
      getHeader: function () { return undefined; },
      json: function () {
        if (statusCode >= 400) reject(new Error('invalid session'));
      },
      send: function () {
        if (statusCode >= 400) reject(new Error('invalid session'));
      },
      end: function () {
        if (statusCode >= 400) reject(new Error('invalid session'));
      }
    };
    try {
      verifier()(req, res, function (err) {
        if (err || statusCode >= 400) {
          reject(err || new Error('invalid session'));
          return;
        }
        resolve(req.auth && req.auth.payload);
      });
    } catch (err) {
      reject(err);
    }
  });
}

function readSession(req, res) {
  if (!ready) {
    res.status(503).json({ error: 'El inicio de sesión no está listo.' });
    return;
  }
  var token = readCookie(req, ID_COOKIE);
  if (!token) {
    res.status(401).json({ error: 'Debes iniciar sesión.' });
    return;
  }
  verifyToken(token).then(function (payload) {
    res.json({
      name: senderName(payload),
      email: payload && typeof payload.email === 'string' ? payload.email : '',
      picture: payload && typeof payload.picture === 'string' ? payload.picture : ''
    });
  }).catch(function () {
    res.status(401).json({ error: 'Debes iniciar sesión.' });
  });
}

function tokenFromSocket(socket) {
  var header = socket.handshake && socket.handshake.headers
    ? socket.handshake.headers.cookie
    : '';
  return readCookie({ headers: { cookie: header || '' } }, ID_COOKIE);
}

function authorizeSocket(socket, next) {
  var token = tokenFromSocket(socket);
  if (!token) {
    next(new Error('Debes iniciar sesión.'));
    return;
  }

  var settled = false;
  function finish(err) {
    if (settled) return;
    settled = true;
    next(err);
  }

  verifyToken(token).then(function (payload) {
    socket.data = socket.data || {};
    socket.data.user = {
      sub: payload && payload.sub,
      name: senderName(payload)
    };
    finish();
  }).catch(function () {
    finish(new Error('Sesión inválida.'));
  });
}

function stampSender(raw, name) {
  var parsed;
  try {
    parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      parsed = { mensaje: '' };
    }
  } catch (e) {
    parsed = { mensaje: typeof raw === 'string' ? raw : '' };
  }
  parsed.nombre = name;
  return JSON.stringify(parsed);
}

module.exports = {
  authSettings: authSettings,
  appBaseUrl: appBaseUrl,
  oauthErrorCode: oauthErrorCode,
  isReady: isReady,
  initAuth0: initAuth0,
  beginLogin: beginLogin,
  finishLogin: finishLogin,
  logout: logout,
  readSession: readSession,
  authorizeSocket: authorizeSocket,
  stampSender: stampSender
};
