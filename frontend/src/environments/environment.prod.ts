export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl:  `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/ws`,
 firebase: {
   apiKey:    'AIzaSyA7m0cCDDjP6nM7NDZTPmXLv2SREUDDywM',
   authDomain: 'k0nkat.firebaseapp.com',
   projectId: 'k0nkat',
 },
};
