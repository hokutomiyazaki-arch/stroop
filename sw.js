// Service Worker for Stroop Task PWA
const CACHE_NAME = 'stroop-task-v4.1.1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './FNT512.png',
    './FNT512-transparent.png'
];

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] Install complete');
            })
            .catch((err) => {
                console.log('[SW] Install failed:', err);
            })
    );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// フェッチ時のキャッシュ戦略（Cache First, Network Fallback）
self.addEventListener('fetch', (event) => {
    // 同一オリジンのリクエストのみ処理
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // キャッシュがあればそれを返す
                    // バックグラウンドで更新確認
                    fetchAndCache(event.request);
                    return cachedResponse;
                }
                
                // キャッシュがなければネットワークから取得
                return fetchAndCache(event.request);
            })
            .catch(() => {
                // オフラインでキャッシュもない場合
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            })
    );
});

// ネットワークから取得してキャッシュに保存
async function fetchAndCache(request) {
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.log('[SW] Fetch failed:', error);
        throw error;
    }
}

// メッセージ受信（更新通知など）
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Skipping waiting');
        self.skipWaiting();
    }
});

// プッシュ通知（将来の拡張用）
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'トレーニングの時間です！',
            icon: './FNT512.png',
            badge: './FNT512.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || './'
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(
                data.title || 'ストループ課題',
                options
            )
        );
    }
});

// 通知クリック時
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes('stroop') && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data.url || './');
                }
            })
    );
});
