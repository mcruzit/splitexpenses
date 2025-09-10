const webpush = require('web-push');
const db = require('../db');
const groupSubscriptions = new Map(); // Map<groupUuid, Set<WebSocket>>

let vapidPublicKey;

function initialize(vpk) {
    vapidPublicKey = vpk;
}

function broadcastToGroup(uuid, message) {
    const subscribers = groupSubscriptions.get(uuid);
    if (subscribers) {
        const payload = JSON.stringify(message);
        subscribers.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(payload);
            }
        });
    }
}

async function sendPushNotificationToGroup(groupId, payload, excludeEndpoint = null) {
    if (!vapidPublicKey) return;
    try {
        const subscriptionsResult = await db.query('SELECT subscription_info FROM push_subscriptions WHERE group_id = $1', [groupId]);
        console.info(subscriptionsResult);
        let subscriptions = subscriptionsResult.rows.map(row => row.subscription_info);

        if (excludeEndpoint) {
            subscriptions = subscriptions.filter(sub => sub.endpoint !== excludeEndpoint);
        }

        const promises = subscriptions.map(sub => webpush.sendNotification(sub, payload).catch(err => {
            if (err.statusCode === 404 || err.statusCode === 410) {
                console.log('Suscripción expirada o inválida, eliminando:', err.endpoint);
                return db.query('DELETE FROM push_subscriptions WHERE subscription_info->>\'endpoint\' = $1', [err.endpoint]);
            } else {
                console.error('Error al enviar notificación push:', err.stack);
            }
        }));
        await Promise.all(promises);
    } catch (error) {
        console.error('Fallo al enviar notificaciones push:', error);
    }
}

function webSocket (ws, req) {
    console.info('WebSocker', req.url);
    console.log('Client connected via WebSocket');
    let subscribedUuid = null;

    const regex = /\/api\/groups\/(.*)\/ws/;
    subscribedUuid = req.url.match(regex)?.[1];
    if (! subscribedUuid) return;

    if (!groupSubscriptions.has(subscribedUuid)) {
        groupSubscriptions.set(subscribedUuid, new Set());
    }
    groupSubscriptions.get(subscribedUuid).add(ws);
    console.log(`Client subscribed to group ${subscribedUuid}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'subscribe' && data.uuid) {
                subscribedUuid = data.uuid;
                if (!groupSubscriptions.has(subscribedUuid)) {
                    groupSubscriptions.set(subscribedUuid, new Set());
                }
                groupSubscriptions.get(subscribedUuid).add(ws);
                console.log(`Client subscribed to group ${subscribedUuid}`);
            }
        } catch (e) {
            console.error('Error parsing WebSocket message:', e);
        }
    });

    ws.on('close', () => {
        if (subscribedUuid && groupSubscriptions.has(subscribedUuid)) {
            groupSubscriptions.get(subscribedUuid).delete(ws);
            console.log(`Client unsubscribed from group ${subscribedUuid}`);
        }
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
};

module.exports = {
    initialize,
    broadcastToGroup,
    sendPushNotificationToGroup,
    webSocket
};

