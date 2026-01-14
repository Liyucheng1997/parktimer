/* ============================================
   停车拍照计时App - Service Worker
   实现离线缓存和后台功能
   ============================================ */

const CACHE_NAME = 'parktimer-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/camera.js',
    '/timer.js',
    '/notification.js',
    '/manifest.json'
];

// 安装事件 - 缓存资源
self.addEventListener('install', (event) => {
    console.log('[SW] 安装中...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] 缓存资源');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] 安装完成');
                return self.skipWaiting();
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('[SW] 激活中...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] 删除旧缓存:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] 激活完成');
                return self.clients.claim();
            })
    );
});

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
    // 只处理GET请求
    if (event.request.method !== 'GET') return;

    // 跳过非同源请求
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // 返回缓存，同时在后台更新
                    event.waitUntil(updateCache(event.request));
                    return cachedResponse;
                }

                // 没有缓存，从网络获取
                return fetch(event.request)
                    .then((response) => {
                        // 缓存新资源
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => cache.put(event.request, responseClone));
                        }
                        return response;
                    });
            })
    );
});

// 后台更新缓存
async function updateCache(request) {
    try {
        const response = await fetch(request);
        if (response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response);
        }
    } catch (error) {
        console.log('[SW] 后台更新失败:', error);
    }
}

// 推送通知
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const title = data.title || '停车提醒';
    const options = {
        body: data.body || '您的停车即将满整点',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        tag: 'parking-reminder',
        requireInteraction: true,
        actions: [
            { action: 'open', title: '查看' },
            { action: 'dismiss', title: '忽略' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then((clientList) => {
                // 如果已有窗口，聚焦
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // 否则打开新窗口
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

console.log('[SW] Service Worker 已加载');
