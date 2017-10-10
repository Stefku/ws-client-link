const Server = require('../index.js').server;
const Client = require('../index.js').client;

describe('Server', () => {
  let server;
  let primary;
  let secondary;

  beforeEach(() => {
    console.log('setup');
    server = new Server(12345);
  });

  afterEach(done => {
    console.log('tear down');
    if (primary && primary.connected) {
      console.log('disconnecting primary...');
      primary.disconnect();
    } else {
      // There will not be a connection unless you have done() in beforeEach, socket.on('connect'...)
      console.log('no connection to break...');
    }
    if (secondary && secondary.connected) {
      console.log('disconnecting secondary...');
      secondary.disconnect();
    } else {
      // There will not be a connection unless you have done() in beforeEach, socket.on('connect'...)
      console.log('no connection to break...');
    }
    if (server) server.close(done);
    done();
  });

  test('should create new session', done => {
    primary = new Client('ws://localhost:12345');
    primary.connect(sessionCreated => {
      const data = JSON.parse(sessionCreated);
      expect(data.command).toBe('SESSION_CREATED');
      done();
    });
  });

  test('should link two clients', done => {
    primary = new Client('ws://localhost:12345');

    primary.connect(
      sessionCreated => {
        secondary = new Client('ws://localhost:12345');

        secondary.joinSession(response => {
          const data = JSON.parse(response);
          expect(data.command).toBe('SESSION_JOINED');
          done();
        });
      },
      clientJoined => {
        const response = JSON.parse(clientJoined);
        expect(response.command).toBe('CLIENT_JOINED');
      }
    );
  });
});
