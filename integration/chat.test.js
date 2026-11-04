var server = require('../server');
var io = require('socket.io-client').io;

var clients = [];

function connect(port) {
  return new Promise(function (resolve, reject) {
    var socket = io('http://127.0.0.1:' + port, {
      transports: ['websocket'],
      forceNew: true
    });
    var timer = setTimeout(function () {
      reject(new Error('socket connection timed out'));
    }, 5000);

    clients.push(socket);
    socket.on('connect', function () {
      clearTimeout(timer);
      resolve(socket);
    });
  });
}

function nextMessage(socket) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      reject(new Error('did not receive a chat message'));
    }, 5000);

    socket.once('Evento-Mensaje-Server', function (msg) {
      clearTimeout(timer);
      resolve(JSON.parse(msg));
    });
  });
}

function closeClients() {
  while (clients.length) {
    clients.pop().close();
  }
}

describe('Chat server', function () {
  var port;

  beforeAll(function (done) {
    server.listen(0, '127.0.0.1', function () {
      port = server.address().port;
      done();
    });
  });

  afterEach(function () {
    closeClients();
  });

  afterAll(function (done) {
    closeClients();
    server.close(done);
  });

  describe('when auth is not configured', function () {
    it('should report that login is disabled', async function () {
      var response = await fetch('http://127.0.0.1:' + port + '/auth/config');
      var body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ enabled: false });
    });
  });

  describe('when a visitor requests the home page', function () {
    it('should return the chat page', async function () {
      var response = await fetch('http://127.0.0.1:' + port + '/');
      var html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain('Chat Socket.IO UNA');
      expect(html).toContain('id="messages"');
    });
  });

  describe('when a user sends a plain message', function () {
    it('should broadcast that message to every connected client', async function () {
      var sender = await connect(port);
      var receiver = await connect(port);
      var sentToSender = nextMessage(sender);
      var sentToReceiver = nextMessage(receiver);

      sender.emit('Evento-Mensaje-Server', JSON.stringify({
        nombre: 'Ana',
        mensaje: 'hola',
        color: '#112233'
      }));

      var fromSender = await sentToSender;
      var fromReceiver = await sentToReceiver;

      expect(fromSender).toEqual(fromReceiver);
      expect(fromReceiver.nombre).toBe('Ana');
      expect(fromReceiver.mensaje).toBe('hola');
      expect(fromReceiver.color).toBe('#112233');
    });
  });

  describe('when a user sends a script tag', function () {
    it('should broadcast the message with the script escaped', async function () {
      var sender = await connect(port);
      var receiver = await connect(port);
      var received = nextMessage(receiver);

      sender.emit('Evento-Mensaje-Server', JSON.stringify({
        nombre: '<script>alert(1)</script>',
        mensaje: '<script>alert(1)</script>',
        color: '#112233'
      }));

      var result = await received;

      expect(result.nombre).not.toContain('<script>');
      expect(result.nombre).toContain('&lt;script&gt;');
      expect(result.mensaje).not.toContain('<script>');
      expect(result.mensaje).toContain('&lt;script&gt;');
    });
  });

  describe('when a user sends an image url', function () {
    it('should broadcast an image tag', async function () {
      var sender = await connect(port);
      var receiver = await connect(port);
      var received = nextMessage(receiver);

      sender.emit('Evento-Mensaje-Server', JSON.stringify({
        nombre: 'Ana',
        mensaje: 'http://image.com/image.jpg',
        color: '#112233'
      }));

      var result = await received;

      expect(result.mensaje).toContain('<img');
      expect(result.mensaje).toContain('http://image.com/image.jpg');
      expect(result.mensaje).not.toContain('<script>');
    });
  });

  describe('when a user sends a youtube url', function () {
    it('should broadcast an embed iframe', async function () {
      var sender = await connect(port);
      var receiver = await connect(port);
      var received = nextMessage(receiver);

      sender.emit('Evento-Mensaje-Server', JSON.stringify({
        nombre: 'Ana',
        mensaje: 'https://www.youtube.com/watch?v=qYwlqx-JLok',
        color: '#112233'
      }));

      var result = await received;

      expect(result.mensaje).toContain('<iframe');
      expect(result.mensaje).toContain('https://www.youtube.com/embed/qYwlqx-JLok');
      expect(result.mensaje).not.toContain('<script>');
    });
  });
});
