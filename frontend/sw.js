const CACHE_NAME = 'gastos-divisor-cache-v1.0.0';
const urlsToCache = [
    '/',
    'index.html',
    'manifest.json',
    'favicon.ico',
    'css/styles.css',
    'js/app.js',
    'js/router.js',
    'js/state.js',
    'js/sync-db.js',
    'js/cache.js',
    'js/utils.js',
    'js/components/add-expense-view.js',
    'js/components/add-person-view.js',
    'js/components/edit-expense-view.js',
    'js/components/edit-person-view.js',
    'js/components/group-view.js',
    'js/components/welcome-view.js',
    'js/components/config-view.js',
    'images/icons/icon-128.png',
    'images/icons/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    'https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css',
    'https://cdn.jsdelivr.net/npm/@ionic/core/css/palettes/dark.class.css',
    'https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js',
    'https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js',
    'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js',
    'https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js',
    'https://cdn.jsdelivr.net/npm/navigo@8.11.1/lib/navigo.min.js',
    'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js'
];

importScripts('js/sync-db.js');

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
        if (request.method === 'GET') {
            // Estrategia Stale-While-Revalidate para GETs
            event.respondWith(
                caches.open(CACHE_NAME).then(cache => {
                    return cache.match(request).then(cachedResponse => {
                        const networkFetch = fetch(request).then(networkResponse => {
                            if (networkResponse.ok) {
                                cache.put(request, networkResponse.clone());
                                networkResponse.clone().json().then(data => {
                                    self.clients.matchAll().then(clients => {
                                        clients.forEach(client => client.postMessage({ type: 'CACHE_UPDATED', url: request.url, data: data }));
                                    });
                                });
                            }
                            return networkResponse;
                        }).catch(() => {});
                        return cachedResponse || networkFetch;
                    });
                })
            );
        } else { // POST, PUT, DELETE
            // Estrategia Network-First, con fallback a encolar para Background Sync
            event.respondWith(
                fetch(request.clone()).catch(async () => {
                    return await queueRequest(request);
                })
            );
        }
        return;
    }

    // Fallback para peticiones no-API (servir desde caché primero)
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            return cachedResponse || fetch(request);
        })
    );
});


self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames.map(cacheName => cacheWhitelist.includes(cacheName) ? null : caches.delete(cacheName))
        )).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('push', event => {
    const data = event.data.json();
    console.log('Push Recibido:', data);

    const options = {
        body: data.body,
        icon: 'images/icons/icon-128.png',
        badge: 'images/icons/icon-128.png',
        data: {
            url: data.data.url
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-mutations') {
        event.waitUntil(syncPendingMutations());
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

async function queueRequest(request) {
    const body = await request.clone().json().catch(() => null);
    const requestData = {
        url: request.url,
        options: {
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: body ? JSON.stringify(body) : null
        }
    };

    await addToSyncQueue(requestData);
    await self.registration.sync.register('sync-mutations');

    return new Response(JSON.stringify({ message: 'Request queued for sync' }), {
        status: 202,
        statusText: 'Accepted',
        headers: { 'Content-Type': 'application/json' }
    });
}

async function syncPendingMutations() {
    try {
        const queuedRequests = await getAllFromSyncQueue();
        if (queuedRequests.length === 0) {
            return;
        }

        const successfulSyncs = [];
        for (const req of queuedRequests) {
            try {
                const response = await fetch(req.url, req.options);
                if (response.ok) {
                    successfulSyncs.push(deleteFromSyncQueue(req.id));
                } else {
                    console.error('La petición sincronizada falló con estado:', response.status, req.url);
                }
            } catch (error) {
                console.error('Error de red al reintentar la petición:', error, req.url);
            }
        }

        await Promise.all(successfulSyncs);

        if (queuedRequests.length > 0 && successfulSyncs.length > 0) {
             self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
            });
            self.registration.showNotification('¡Estás de vuelta!', {
                body: 'Tus cambios pendientes han sido sincronizados.',
                icon: 'images/icons/icon-128.png'
            });
        }
    } catch (error) {
        console.error('Error durante la sincronización en segundo plano:', error);
    }
}