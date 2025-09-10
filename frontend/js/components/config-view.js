import { LitElement, html } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { getTheme, setTheme } from '../state.js';

class ConfigView extends LitElement {
    static properties = {
        _router: { state: true },
        theme: { state: true },
    };

    constructor() {
        super();
        this._router = null;
        this.theme = getTheme();
    }

    render() {
        return html`
            <ion-header>
                <ion-toolbar>
                    <ion-buttons slot="start">
                        <ion-button @click=${() => this._router.navigate('/')}>
                            <ion-icon slot="icon-only" name="arrow-back"></ion-icon>
                        </ion-button>
                    </ion-buttons>
                    <ion-title>Configuración</ion-title>
                </ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding">
                <ion-list>
                    <ion-item>
                        <ion-label>Tema de Color</ion-label>
                        <ion-select value="${this.theme}" @ionChange=${this.changeTheme} interface="alert">
                            <ion-select-option value="light">Claro</ion-select-option>
                            <ion-select-option value="dark">Oscuro</ion-select-option>
                            <ion-select-option value="system">Sistema</ion-select-option>
                        </ion-select>
                    </ion-item>
                    <ion-item>
                        <ion-label>Notificaciones</ion-label>
                        <ion-button @click=${this.subscribeToNotifications}>
                            Activar
                        </ion-button>
                    </ion-item>
                </ion-list>
            </ion-content>
        `;
    }

    changeTheme(e) {
        const newTheme = e.detail.value;
        if (newTheme) {
            setTheme(newTheme);
            this.theme = newTheme;
        }
    }

    async subscribeToNotifications() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return this.presentToast('Las notificaciones push no son soportadas por tu navegador.', 'danger');
        }

        try {
            const permission = await window.Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permiso de notificación no concedido.');
            }

            const recentGroups = JSON.parse(localStorage.getItem('gastos_grupos_recientes')) || [];
            if (recentGroups.length === 0) {
                return this.presentToast('No estás en ningún grupo para activar notificaciones.', 'warning');
            }

            // IMPORTANTE: Reemplazar con la clave pública VAPID real del backend
            const VAPID_PUBLIC_KEY = 'BA_gTPLAZXg25OHg2n3_p_4v2a44KzIm2l3g6DSiY2j2-g8X2hY2aK8b8Y2j2-g8X2hY2aK8b8Y2j2-g8X2hY=';
            
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
            }

            const promises = recentGroups.map(group => {
                return fetch('/api/push/subscribe', {
                    method: 'POST',
                    body: JSON.stringify({ subscription, groupId: group.id }),
                    headers: { 'Content-Type': 'application/json' }
                });
            });

            const responses = await Promise.all(promises);
            const allOk = responses.every(res => res.ok);

            if (allOk) {
                this.presentToast('Notificaciones activadas para todos tus grupos.', 'success');
            } else {
                throw new Error('Algunas suscripciones fallaron.');
            }

        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            this.presentToast(`Error al activar notificaciones: ${error.message}`, 'danger');
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async presentToast(message, color = 'primary') {
        const toast = document.createElement('ion-toast');
        toast.message = message;
        toast.duration = 3000;
        toast.color = color;
        toast.position = 'top';
        document.body.appendChild(toast);
        await toast.present();
    }
}

customElements.define('config-view', ConfigView);