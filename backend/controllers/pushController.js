const db = require("../db");

exports.subscribePushNotification = async (req, res) => {
    const { subscription, groupId } = req.body;

    try {
        await db.query('INSERT INTO push_subscriptions (subscription_info, group_id) VALUES ($1, $2)', [subscription, groupId]);
        res.status(201).json({ message: 'Suscripción guardada.' });
    } catch (error) {
        console.info(error)
        res.status(500).json({ error: 'Error al guardar la suscripción.' });
    }
};
