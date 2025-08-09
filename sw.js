const CACHE_NAME = 'hanoma-keyboard-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 서비스 워커 설치
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 캐시된 자원 요청 처리
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 캐시된 응답을 반환
        if (response) {
          return response;
        }
        // 캐시에 없으면 네트워크에서 가져옴
        return fetch(event.request);
      })
  );
});