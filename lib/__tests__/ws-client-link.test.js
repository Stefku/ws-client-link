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
      console.log('no connection to break...');
    }
    if (secondary && secondary.connected) {
      console.log('disconnecting secondary...');
      secondary.disconnect();
    } else {
      console.log('no connection to break...');
    }
    if (server) server.close(done);
    done();
  });

  test('should create new session', done => {
    primary = new Client('ws://localhost:12345');
    primary.createSession(sessionCreated => {
      const data = JSON.parse(sessionCreated);
      expect(data.command).toBe('SESSION_CREATED');
      done();
    });
  });

  test('should link two clients', done => {
    primary = new Client('ws://localhost:12345');

    primary.createSession(
      () => {
        secondary = new Client('ws://localhost:12345');

        secondary.joinSession(response => {
          const data = JSON.parse(response);
          expect(data.command).toBe('SESSION_JOINED');
        });
      },
      clientJoined => {
        const response = JSON.parse(clientJoined);
        expect(response.command).toBe('CLIENT_JOINED');
        done();
      }
    );
  });

  test('should pass data to linked client', done => {
    primary = new Client('ws://localhost:12345');

    primary.createSession(
      () => {
        secondary = new Client('ws://localhost:12345');

        secondary.joinSession(
          sessionJoined => {
            const data = JSON.parse(sessionJoined);
            expect(data.command).toBe('SESSION_JOINED');
          },
          dataSent => {
            const data = JSON.parse(dataSent);
            expect(data.command).toBe('DATA_SENT');
            expect(data.data).toBe('Hello World');
            done();
          }
        );
      },
      clientJoined => {
        const response = JSON.parse(clientJoined);
        expect(response.command).toBe('CLIENT_JOINED');

        primary.sendData('Hello World');
      }
    );
  });
});
