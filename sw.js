const CACHE = 'hakla-hunt-v2';
const CORE_ASSETS = [
	'./',
	'./index.html',
	'./style.css',
	'./game.js',
	'./manifest.webmanifest',
	'./icons/icon-192.png',
	'./icons/icon-512.png',
	'./icons/maskable-512.png',
	'./icons/apple-touch-icon.png',
	'./icons/favicon-32.png',
	'./assets/background.jpg',
	'./assets/enemy.png',
	'./assets/blood.png',
	'./assets/gunshot.mp3',
	'./assets/hit-sound-1.mp3',
	'./assets/death-sound.mp3',
	'./assets/jafi.mp3'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE)
			.then((cache) => Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url))))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		caches.match(request, { ignoreSearch: true }).then((cached) => {
			const network = fetch(request)
				.then((response) => {
					if (response && response.ok) {
						const copy = response.clone();
						caches.open(CACHE).then((cache) => cache.put(request, copy));
					}
					return response;
				})
				.catch(() => cached || caches.match('./index.html'));
			return cached || network;
		})
	);
});
