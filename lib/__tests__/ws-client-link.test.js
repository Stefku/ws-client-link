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
      const response = JSON.parse(sessionCreated);
      expect(response.command).toBe('SESSION_CREATED');
      done();
    });
  });

  test('should link two clients', done => {
    primary = new Client('ws://localhost:12345');

    primary.createSession(
      () => {
        secondary = new Client('ws://localhost:12345');

        secondary.joinSession(sessionJoined => {
          const response = JSON.parse(sessionJoined);
          expect(response.command).toBe('SESSION_JOINED');
        });
      },
      clientJoined => {
        const response = JSON.parse(clientJoined);
        expect(response.command).toBe('CLIENT_JOINED');
        done();
      }
    );
  });

  test('should pass data from primary to secondary client', done => {
    primary = new Client('ws://localhost:12345');

    primary.createSession(
      () => {
        secondary = new Client('ws://localhost:12345');

        secondary.joinSession(
          sessionJoined => {
            const response = JSON.parse(sessionJoined);
            expect(response.command).toBe('SESSION_JOINED');
          },
          dataSent => {
            const response = JSON.parse(dataSent);
            expect(response.command).toBe('DATA_SENT');
            expect(response.data).toBe('Hello Secondary!');
            done();
          }
        );
      },
      clientJoined => {
        const response = JSON.parse(clientJoined);
        expect(response.command).toBe('CLIENT_JOINED');

        primary.sendData('Hello Secondary!');
      }
    );
  });

  test('should pass data from secondary to primary client', done => {
    primary = new Client('ws://localhost:12345');

    primary.createSession(
      () => {
        secondary = new Client('ws://localhost:12345');

        secondary.joinSession(sessionJoined => {
          const response = JSON.parse(sessionJoined);
          expect(response.command).toBe('SESSION_JOINED');
        });
      },
      clientJoined => {
        const response = JSON.parse(clientJoined);
        expect(response.command).toBe('CLIENT_JOINED');

        secondary.sendData('Hello Primary!');
      },
      dataSent => {
        const response = JSON.parse(dataSent);
        expect(response.command).toBe('DATA_SENT');
        expect(response.data).toBe('Hello Primary!');
        done();
      }
    );
  });
});
