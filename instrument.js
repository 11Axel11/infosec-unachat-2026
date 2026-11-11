const Sentry = require('@sentry/node');

if (process.env.VERCEL && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'vercel',
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}
