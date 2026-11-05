var expect = require('chai').expect;
var vault = require('../server/vault');
var auth = require('../server/auth');

describe('Supabase Vault loader', function () {

  it('should refuse to start without VAULT_DATABASE_URL', function () {
    return vault.loadAuth0ClientSecret({ connectionString: '' }).then(function () {
      throw new Error('expected a missing URL to fail');
    }, function (err) {
      expect(err.message).to.equal(vault.SAFE_MESSAGES.missingUrl);
    });
  });

  it('should reject a non-Postgres URL', function () {
    return vault.loadAuth0ClientSecret({ connectionString: 'https://example.test' }).then(function () {
      throw new Error('expected a bad URL to fail');
    }, function (err) {
      expect(err.message).to.equal(vault.SAFE_MESSAGES.badUrl);
    });
  });

  it('should hide a database error that contains the secret', function () {
    var leaked = 'super-secret-value-0123456789';
    return vault.loadAuth0ClientSecret({
      connectionString: 'postgres://una_chat_backend:password@db.example.supabase.co:5432/postgres',
      query: function () {
        var err = new Error('failed near ' + leaked + ' postgres://una_chat_backend:password@db.example.supabase.co:5432/postgres');
        err.code = 'XX000';
        throw err;
      }
    }).then(function () {
      throw new Error('expected the query error to fail closed');
    }, function (err) {
      expect(err.message).to.equal(vault.SAFE_MESSAGES.generic);
      expect(err.message).to.not.contain(leaked);
      expect(err.message).to.not.contain('postgres://');
    });
  });

  it('should describe an unverified certificate and an unreachable host', function () {
    expect(vault.describeVaultFailure({ code: 'UNABLE_TO_GET_ISSUER_CERT' })).to.equal(vault.SAFE_MESSAGES.certificate);
    expect(vault.describeVaultFailure({ code: 'ENETUNREACH' })).to.equal(vault.SAFE_MESSAGES.unreachable);
  });

  it('should report a missing privilege without the secret', function () {
    return vault.loadAuth0ClientSecret({
      connectionString: 'postgres://example',
      query: function () {
        var err = new Error('permission denied for function get_auth0_client_secret');
        err.code = '42501';
        throw err;
      }
    }).then(function () {
      throw new Error('expected permission denied');
    }, function (err) {
      expect(err.message).to.equal(vault.SAFE_MESSAGES.denied);
    });
  });

  it('should return the secret only to the caller', function () {
    return vault.loadAuth0ClientSecret({
      connectionString: 'postgres://example',
      query: function () {
        return Promise.resolve({ rows: [{ secret: 'abcdefghijklmnopqrstuvwxyz' }] });
      }
    }).then(function (secret) {
      expect(secret).to.equal('abcdefghijklmnopqrstuvwxyz');
    });
  });

});

describe('Auth0 public surface', function () {

  var previousBase;
  var previousRender;

  beforeEach(function () {
    previousBase = process.env.APP_BASE_URL;
    previousRender = process.env.RENDER_EXTERNAL_URL;
    delete process.env.APP_BASE_URL;
    delete process.env.RENDER_EXTERNAL_URL;
  });

  afterEach(function () {
    if (previousBase === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previousBase;
    if (previousRender === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = previousRender;
  });

  it('should accept only local http and public https base URLs', function () {
    process.env.APP_BASE_URL = 'http://localhost:3000/';
    expect(auth.appBaseUrl()).to.equal('http://localhost:3000');

    process.env.APP_BASE_URL = 'https://infosec-unachat-2026.onrender.com';
    expect(auth.appBaseUrl()).to.equal('https://infosec-unachat-2026.onrender.com');

    process.env.APP_BASE_URL = 'http://evil.example';
    expect(auth.appBaseUrl()).to.equal('');

    process.env.APP_BASE_URL = 'https://user:secret@infosec-unachat-2026.onrender.com';
    expect(auth.appBaseUrl()).to.equal('');
  });

  it('should keep OAuth failure logs to a known error code', function () {
    expect(auth.oauthErrorCode({
      code: 'token_by_code_error',
      message: 'client_secret=super-secret-value-0123456789',
      cause: { error: 'invalid_client', error_description: 'client_secret=super-secret-value-0123456789' }
    })).to.equal('invalid_client');

    expect(auth.oauthErrorCode({
      message: 'postgres://una_chat_backend:password@localhost/postgres'
    })).to.equal('unknown');
  });

});
