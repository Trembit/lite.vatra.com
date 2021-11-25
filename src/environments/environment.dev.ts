export const environment = {
  production: true,
  sentryDSN: 'https://some-sentry-url.com',
  sentryOrigin: 'localhost:4200',
  callstats: {
    appId: 111222333,
    appSecret: 'some-app-secret',
  },
  envName: 'dev',
  janus: {
    debug: false,
    stringRoomIds: false,
    server: 'wss://janus-cloud-url.com:443'
  },
};
