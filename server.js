
require('dotenv').config({ quiet: true });

var path = require('path');
var express = require('express');
var validation = require('./libs/unalib');
var authGate = require('./server/auth');
var vault = require('./server/vault');

// OpenTelemetry - Logs para Grafana Cloud
var otelLogs = require('@opentelemetry/api-logs');
var sdkLogs = require('@opentelemetry/sdk-logs');
var OTLPLogExporter = require(
  '@opentelemetry/exporter-logs-otlp-http'
).OTLPLogExporter;
var resourceFromAttributes = require(
  '@opentelemetry/resources'
).resourceFromAttributes;

var loggerProvider = null;
var logger = null;

// Configurar el proveedor de logs para el entorno local
if (
  process.env.OTEL_SERVICE_NAME &&
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT &&
  !process.env.VERCEL
) {
  var exporter = new OTLPLogExporter();

  loggerProvider = new sdkLogs.LoggerProvider({
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME,
      'deployment.environment': 'local'
    }),
    processors: [
      new sdkLogs.BatchLogRecordProcessor({
        exporter: exporter,
        scheduledDelayMillis: 1000
      })
    ]
  });

  logger = loggerProvider.getLogger('una-chat');
}

var app = express();
app.set('trust proxy', 1);

var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/auth/config', function (req, res) {
  var settings = authGate.authSettings();

  if (!settings) {
    res.json({ enabled: false });
    return;
  }

  res.json({
    enabled: true,
    domain: settings.domain,
    clientId: settings.clientId
  });
});

app.get('/auth/login', function (req, res) {
  if (!authGate.authSettings()) {
    res.status(404).json({ error: 'Login is disabled.' });
    return;
  }

  authGate.beginLogin(req, res);
});

app.get('/auth/callback', function (req, res) {
  if (!authGate.authSettings()) {
    res.redirect('/');
    return;
  }

  authGate.finishLogin(req, res);
});

app.get('/auth/logout', function (req, res) {
  authGate.logout(req, res);
});

app.get('/sala', function (req, res) {
  if (!authGate.authSettings()) {
    res.json({ enabled: false });
    return;
  }

  authGate.readSession(req, res);
});

app.get('/profile.js', function (req, res) {
  res.sendFile(path.join(__dirname, 'libs', 'profile.js'));
});

// Autenticación de conexiones Socket.IO
io.use(function (socket, next) {
  if (!authGate.authSettings()) {
    next();
    return;
  }

  authGate.authorizeSocket(socket, next);
});

// Comunicación de mensajes en tiempo real
io.on('connection', function (socket) {
  socket.on('Evento-Mensaje-Server', function (msg) {
    if (socket.data && socket.data.user && socket.data.user.name) {
      msg = authGate.stampSender(msg, socket.data.user.name);
    }

    msg = validation.validateMessage(msg);

    // Registrar actividad sin almacenar datos personales
    // ni el contenido de los mensajes
    if (logger) {
      logger.emit({
        severityNumber: otelLogs.SeverityNumber.INFO,
        severityText: 'INFO',
        body: 'Mensaje procesado correctamente en UNA Chat',
        attributes: {
          'app.module': 'chat',
          'app.event': 'message_received',
          'deployment.environment': 'local'
        }
      });
    }

    io.emit('Evento-Mensaje-Server', msg);
  });
});

// Inicialización de Auth0
function boot() {
  if (!authGate.authSettings()) {
    return Promise.resolve();
  }

  if (process.env.AUTH0_CLIENT_SECRET) {
    console.warn(
      'AUTH0_CLIENT_SECRET is set and is ignored. The client secret is loaded from Supabase Vault.'
    );
  }

  return vault.loadAuth0ClientSecret().then(function (secret) {
    return authGate.initAuth0(secret).catch(function (err) {
      var message = err && err.message ? String(err.message) : '';

      if (message.indexOf('Auth0 ') === 0 && message.length < 120) {
        throw new Error(message);
      }

      throw new Error(vault.redact(message, secret));
    });
  });
}

// Arranque del servidor
if (require.main === module) {
  boot().then(function () {
    http.listen(port, function () {
      console.log('listening on *:' + port);
    });
  }).catch(function (err) {
    console.error(
      err && err.message ? err.message : 'Auth0 startup failed.'
    );

    process.exit(1);
  });
}

module.exports = http;
