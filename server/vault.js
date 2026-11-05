var fs = require('fs');
var path = require('path');
var tls = require('tls');

var SAFE_MESSAGES = {
  missingUrl: 'VAULT_DATABASE_URL is missing. The Auth0 client secret must be read from Supabase Vault.',
  badUrl: 'VAULT_DATABASE_URL must be a Postgres connection string.',
  empty: 'Vault did not return the Auth0 client secret una_chat_auth0_client_secret.',
  login: 'Vault login failed for the configured database role.',
  denied: 'The database role cannot execute una_chat_private.get_auth0_client_secret.',
  missingFunction: 'The Vault function una_chat_private.get_auth0_client_secret is missing.',
  unreachable: 'Supabase Vault is unreachable.',
  certificate: 'The Vault connection certificate could not be verified.',
  generic: 'Could not load the Auth0 client secret from Supabase Vault.'
};

var SECRET_QUERY = 'select una_chat_private.get_auth0_client_secret() as secret';

function redact(message, secret) {
  var text = typeof message === 'string' ? message : '';
  if (!text) return SAFE_MESSAGES.generic;
  if (secret && text.indexOf(secret) !== -1) return SAFE_MESSAGES.generic;
  if (/postgres(?:ql)?:\/\//i.test(text)) return SAFE_MESSAGES.generic;
  if (Object.keys(SAFE_MESSAGES).some(function (key) {
    return SAFE_MESSAGES[key] === text;
  })) {
    return text;
  }
  return SAFE_MESSAGES.generic;
}

function describeVaultFailure(err) {
  var code = err && err.code;
  if (code === '28P01' || code === '28000') return SAFE_MESSAGES.login;
  if (code === '42501') return SAFE_MESSAGES.denied;
  if (code === 'P0002') return SAFE_MESSAGES.empty;
  if (code === '42883' || code === '42P01' || code === '3F000') {
    return SAFE_MESSAGES.missingFunction;
  }
  if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'EAI_AGAIN' || code === 'ENETUNREACH') {
    return SAFE_MESSAGES.unreachable;
  }
  if (code === 'SELF_SIGNED_CERT_IN_CHAIN' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'UNABLE_TO_GET_ISSUER_CERT' || code === 'CERT_HAS_EXPIRED') {
    return SAFE_MESSAGES.certificate;
  }
  var message = err && err.message ? String(err.message) : '';
  if (/timeout/i.test(message)) return SAFE_MESSAGES.unreachable;
  if (message === SAFE_MESSAGES.empty || message === SAFE_MESSAGES.missingUrl || message === SAFE_MESSAGES.badUrl) {
    return message;
  }
  return SAFE_MESSAGES.generic;
}

function assertConnectionString(connectionString) {
  if (!connectionString) {
    var missing = new Error(SAFE_MESSAGES.missingUrl);
    missing.code = 'VAULT_URL';
    throw missing;
  }
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) {
    var bad = new Error(SAFE_MESSAGES.badUrl);
    bad.code = 'VAULT_URL';
    throw bad;
  }
}

function vaultSsl() {
  var extra = fs.readFileSync(path.join(__dirname, 'supabase-root-2021-ca.pem'), 'utf8');
  return {
    rejectUnauthorized: true,
    ca: tls.rootCertificates.concat(extra)
  };
}

function defaultQuery(connectionString) {
  var Client = require('pg').Client;
  var parsed = require('pg-connection-string').parse(connectionString);
  parsed.ssl = vaultSsl();
  parsed.connectionTimeoutMillis = 10000;
  parsed.query_timeout = 8000;
  parsed.application_name = 'una-chat-vault';
  var client = new Client(parsed);

  return client.connect().then(function () {
    return client.query(SECRET_QUERY);
  }).then(function (result) {
    return client.end().then(function () {
      return result;
    }, function () {
      return result;
    });
  }, function (err) {
    return client.end().then(function () {
      throw err;
    }, function () {
      throw err;
    });
  });
}

function loadAuth0ClientSecret(options) {
  options = options || {};
  var connectionString = options.connectionString || process.env.VAULT_DATABASE_URL;
  var runQuery = options.query || function () {
    return defaultQuery(connectionString);
  };

  return Promise.resolve().then(function () {
    assertConnectionString(connectionString);
    return runQuery(connectionString);
  }).then(function (result) {
    var row = result && result.rows && result.rows[0];
    var secret = row && row.secret;
    if (typeof secret !== 'string' || secret.length < 16) {
      var empty = new Error(SAFE_MESSAGES.empty);
      empty.code = 'P0002';
      throw empty;
    }
    return secret;
  }).catch(function (err) {
    if (err && (err.code === 'VAULT_URL')) throw err;
    var safe = new Error(describeVaultFailure(err));
    safe.code = err && err.code;
    throw safe;
  });
}

module.exports = {
  SAFE_MESSAGES: SAFE_MESSAGES,
  describeVaultFailure: describeVaultFailure,
  loadAuth0ClientSecret: loadAuth0ClientSecret,
  redact: redact
};
