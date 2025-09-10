import router from './router.js';
import { initializeTheme } from './state.js';

let VAPID_PUBLIC_KEY = '';

async function getVapidPublicKey() {
    try {
        const response = await fetch('/api/vapid-public-key');
        const data = await response.text();
        VAPID_PUBLIC_KEY = data;
    } catch (error) {
        console.error('Error fetching VAPID public key:', error);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeToPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
  }
}
window.subscribeToPush = subscribeToPush;

function showUpdateToast(worker) {
  const toast = document.createElement('ion-toast');
  toast.header = 'Actualización Disponible';
  toast.message = 'Hay una nueva versión de la aplicación lista para instalar.';
  toast.position = 'bottom';
  toast.color = 'primary';
  toast.buttons = [
    {
      side: 'end',
      text: 'Actualizar',
      handler: () => {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
    },
    {
      side: 'end',
      text: 'Cerrar',
      role: 'cancel'
    }
  ];
  document.body.appendChild(toast);
  toast.present();
}

document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await getVapidPublicKey();
    router.resolve();

    // --- Lógica de Conexión ---
    const connectionStatusEl = document.getElementById('connection-status');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const THEME_COLOR_ONLINE = '#4f46e5';
    const THEME_COLOR_OFFLINE = '#ef4444';
    let onlineTimeout;

    function handleOnline() {
        if (themeColorMeta) themeColorMeta.content = THEME_COLOR_ONLINE;
        connectionStatusEl.textContent = 'Conectado';
        connectionStatusEl.classList.remove('offline');
        connectionStatusEl.classList.add('online');
        clearTimeout(onlineTimeout);
        onlineTimeout = setTimeout(() => {
            connectionStatusEl.classList.remove('online');
        }, 3000);
    }

    function handleOffline() {
        if (themeColorMeta) themeColorMeta.content = THEME_COLOR_OFFLINE;
        connectionStatusEl.textContent = 'Sin conexión';
        connectionStatusEl.classList.remove('online');
        connectionStatusEl.classList.add('offline');
        clearTimeout(onlineTimeout);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Comprobar estado inicial solo para el caso offline
    if (!navigator.onLine) {
        handleOffline();
    }
    // --- Fin Lógica de Conexión ---

    if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                    
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showUpdateToast(newWorker);
                            }
                        });
                    });

                    // Pedir permiso para notificaciones
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        console.log('Notification permission granted.');
                        // subscribeToPush();
                      }
                    });
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });

            let refreshing;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                window.location.reload();
                refreshing = true;
            });
    }
});