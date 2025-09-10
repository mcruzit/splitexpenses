const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const webpush = require('web-push');
const cors = require('cors');
const db = require('./db');
const { addExpenseToGroup, updateExpense, deleteExpense } = require('./controllers/expenseController');
const { createGroup, getGroup, updateGroup, deleteGroup, calculateDebts } = require('./controllers/groupController');
const { addPersonToGroup, deletePerson, updatePerson } = require('./controllers/personController');
const { subscribePushNotification } = require('./controllers/pushController');
const { initialize, webSocket } = require('./services/notificationService');

const app = express();
const server = http.createServer(app); // Creamos un servidor HTTP a partir de la app de Express
const PORT = process.env.PORT || 3000;

// --- Configuración de Web Push ---
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("ADVERTENCIA: Las claves VAPID no están configuradas. Las notificaciones push no funcionarán.");
} else {
    webpush.setVapidDetails(
        'mailto:maximiliano.l.cruz@gmail.com', // Reemplaza con tu email
        vapidPublicKey,
        vapidPrivateKey
    );
}

// Middlewares
app.use(cors());
app.use(express.json());

app.get('/api/vapid-public-key', (req, res) => {
    if (!vapidPublicKey) {
        return res.status(500).send('La clave pública VAPID no está configurada en el servidor.');
    }
    res.send(vapidPublicKey);
});

app.post('/api/push/subscribe', subscribePushNotification);

app.post('/api/groups', createGroup);
app.get('/api/groups/:groupUuid', getGroup);
app.put('/api/groups/:groupUuid', updateGroup);
app.delete('/api/groups/:groupUuid', deleteGroup);

app.get('/api/groups/:groupUuid/calculate', calculateDebts);

app.post('/api/groups/:groupUuid/people', addPersonToGroup);
app.put('/api/groups/:groupUuid/people/:personId', updatePerson);
app.delete('/api/groups/:groupUuid/people/:personId', deletePerson);

app.post('/api/groups/:groupUuid/expenses', addExpenseToGroup);
app.put('/api/groups/:groupUuid/expenses/:expenseId', updateExpense);
app.delete('/api/groups/:groupUuid/expenses/:expenseId', deleteExpense);

// --- WebSocket Server Setup ---
const wss = new WebSocketServer({ server });

wss.on('connection', webSocket);
initialize(vapidPublicKey);

db.initializeDb().then(() => {
    server.listen(PORT, () => { // Usamos server.listen en lugar de app.listen
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}).catch(error => {
    console.error('Fallo al iniciar el servidor:', error);
    process.exit(1);
});
