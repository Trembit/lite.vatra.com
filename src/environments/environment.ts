// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  sentryDSN: 'https://some-sentry-url.com',
  sentryOrigin: 'localhost:4200',
  callstats: {
    appId: 111222333,
    appSecret: 'some-app-secret',
  },
  envName: 'develop',
  janus: {
    debug: false,
    stringRoomIds: false,
    server: 'wss://janus-cloud-url.com:443',
  },
};
