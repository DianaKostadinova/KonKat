export const environment = {
  production: true,
  // Build-time fallback. Override at runtime by setting
  // `window.__KONKAT_CONFIG__.clerkPublishableKey` before the bundle loads
  // (see public/config.js or a templated tag in index.html). This lets ops
  // swap keys without rebuilding the image.
  clerkPublishableKey: 'pk_test_ZnJhbmstcGVuZ3Vpbi0xMC5jbGVyay5hY2NvdW50cy5kZXYk',
  // In Docker, Nginx proxies /api → backend and /ws → backend WebSocket.
  apiUrl: '/api',
  wsUrl:  `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/ws`,
};
