export const environment = {
  production: true,
  clerkPublishableKey: 'pk_test_ZnJhbmstcGVuZ3Vpbi0xMC5jbGVyay5hY2NvdW50cy5kZXYk',
  // In Docker, Nginx proxies /api → backend and /ws → backend WebSocket.
  // Replace clerkPublishableKey with your real production key via build args if needed.
  apiUrl: '/api',
  wsUrl:  `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/ws`,
};
