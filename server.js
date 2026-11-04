require('dotenv').config({ quiet: true });

var path = require('path');
var express = require('express');
var validation = require('./libs/unalib');
var authGate = require('./server/auth');

var app = express();
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

app.get('/vendor/auth0-spa-js.js', function (req, res) {
  res.sendFile(path.join(
    __dirname,
    'node_modules',
    '@auth0',
    'auth0-spa-js',
    'dist',
    'auth0-spa-js.production.js'
  ));
});

io.use(function (socket, next) {
  if (!authGate.authSettings()) {
    next();
    return;
  }
  authGate.authorizeSocket(socket, next);
});

io.on('connection', function (socket) {
  socket.on('Evento-Mensaje-Server', function (msg) {
    if (socket.data && socket.data.user && socket.data.user.name) {
      msg = authGate.stampSender(msg, socket.data.user.name);
    }
    msg = validation.validateMessage(msg);
    io.emit('Evento-Mensaje-Server', msg);
  });
});

if (require.main === module) {
  if (authGate.authSettings() && !process.env.AUTH0_CLIENT_SECRET) {
    console.warn('AUTH0_CLIENT_SECRET is empty. SPA login does not send it.');
  }
  http.listen(port, function () {
    console.log('listening on *:' + port);
  });
}

module.exports = http;
