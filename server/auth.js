function authSettings() {
  var domain = process.env.AUTH0_DOMAIN;
  var clientId = process.env.AUTH0_CLIENT_ID;
  if (!domain || !clientId) return null;
  return { domain: domain, clientId: clientId };
}

var jwtMiddleware = null;

function verifier() {
  if (!jwtMiddleware) {
    var settings = authSettings();
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

function authorizeSocket(socket, next) {
  var token = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
  if (!token || typeof token !== 'string') {
    next(new Error('Debes iniciar sesión.'));
    return;
  }

  var settled = false;
  function finish(err) {
    if (settled) return;
    settled = true;
    next(err);
  }

  var statusCode = 200;
  var req = {
    headers: { authorization: 'Bearer ' + token },
    protocol: 'https',
    originalUrl: '/socket.io/',
    url: '/socket.io/',
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
      if (statusCode >= 400) finish(new Error('Sesión inválida.'));
    },
    send: function () {
      if (statusCode >= 400) finish(new Error('Sesión inválida.'));
    },
    end: function () {
      if (statusCode >= 400) finish(new Error('Sesión inválida.'));
    }
  };

  verifier()(req, res, function (err) {
    if (err || statusCode >= 400) {
      finish(err || new Error('Sesión inválida.'));
      return;
    }
    var payload = req.auth && req.auth.payload;
    socket.data = socket.data || {};
    socket.data.user = {
      sub: payload && payload.sub,
      name: senderName(payload)
    };
    finish();
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
  authorizeSocket: authorizeSocket,
  stampSender: stampSender
};
