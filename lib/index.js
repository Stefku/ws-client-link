'use strict';

const WebSocket = require('ws');

class Server {
  constructor(port) {
    this.wss = new WebSocket.Server({ port: port });
    const session = {
      primary: undefined,
      secondary: undefined
    };
    this.wss.on('connection', connection => {
      connection.on('message', messageSer => {
        console.log('received: %s', messageSer);
        const message = JSON.parse(messageSer);
        if (message && message.command === 'CREATE_SESSION') {
          session.primary = connection;
          connection.send(
            JSON.stringify({
              command: 'SESSION_CREATED',
              sessionId: 1
            })
          );
        } else if (message && message.command === 'JOIN_SESSION') {
          if (session.primary) {
            session.secondary = connection;
            session.primary.send(
              JSON.stringify({
                command: 'CLIENT_JOINED',
                secondaryClientAddress: session.secondary.remoteAddress
              })
            );
            session.secondary.send(
              JSON.stringify({
                command: 'SESSION_JOINED',
                primaryClientAddress: session.primary.remoteAddress
              })
            );
          } else {
            connection.send(
              JSON.stringify({
                command: 'ERROR_JOIN_SESSION',
                error: 'No Session available'
              })
            );
          }
        } else if (message && message.command === 'SEND_DATA') {
          // If from primary, send data to secondary and vice versa
          if (connection === session.secondary) {
            session.primary.send(
              JSON.stringify({
                command: 'DATA_SENT',
                data: message.data
              })
            );
          } else if (connection === session.primary) {
            session.secondary.send(
              JSON.stringify({
                command: 'DATA_SENT',
                data: message.data
              })
            );
          } else {
            console.error('cannot resolve connection');
          }
        }
      });

      connection.on('close', function(reasonCode, description) {
        // If primary, close session, message to secondary
        // if secondary, message to primary
      });
    });
  }

  close(cb) {
    this.wss.close(cb);
  }
}

class Client {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
  }

  createSession(onSessionCreated, onClientJoined) {
    this.wsc = new WebSocket(this.serverUrl);

    this.wsc.on('open', () => {
      this.wsc.send(
        JSON.stringify({
          command: 'CREATE_SESSION'
        })
      );
    });

    this.wsc.on('message', data => {
      const response = JSON.parse(data);
      if (response.command === 'SESSION_CREATED') {
        if (onSessionCreated) onSessionCreated(data);
      } else if (response.command === 'CLIENT_JOINED') {
        if (onClientJoined) onClientJoined(data);
      }
    });
  }

  joinSession(onSessionJoined, onDataSent) {
    this.wsc = new WebSocket(this.serverUrl);

    this.wsc.on('open', () => {
      this.wsc.send(
        JSON.stringify({
          command: 'JOIN_SESSION'
        })
      );
    });

    this.wsc.on('message', data => {
      const response = JSON.parse(data);
      if (response.command === 'SESSION_JOINED') {
        if (onSessionJoined) onSessionJoined(data);
      } else if (response.command === 'DATA_SENT') {
        if (onDataSent) onDataSent(data);
      }
    });
  }

  sendData(data) {
    this.wsc.send(
      JSON.stringify({
        command: 'SEND_DATA',
        data: data
      })
    );
  }
}

module.exports.server = Server;
module.exports.client = Client;
