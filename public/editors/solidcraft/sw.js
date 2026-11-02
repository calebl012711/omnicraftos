// Retire the inherited SolidCraft offline worker when it next updates. Model
// loads the reviewed host adapter and content-hashed module from the network.
// Leave cached data and all user project storage intact.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await self.clients.claim();
  await self.registration.unregister();
})()));
